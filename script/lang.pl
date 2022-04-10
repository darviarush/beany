#!/usr/bin/env perl
# выделяет из файлов строки

@files = glob "lib/*.php *.php www/js/*.js www/index.htm plugin/*/*.php plugin/*/*.js plugin/*/*.html";

$fn_code = sub { $s =~ s/\\(['"])/$1/g; $s =~ s/\n/\\n/g };
$fn_html = sub { $s =~ s/^\s*(.*?)\s*$/$1/; $s =~ s/\s+/ /g; };

$bh = qr!'((?:\\.|[^'])*)'!;
$qq = qr!"((?:\\.|[^"])*)"!;
$sharp = qr!#.*!;
$reg = qr![\(&\|]\s*\/[^\/]+\/!;
$com = qr!//.*|/\*(?:.|\s)*?\*/!;
$sh = qr!$bh|$qq|$com|$sharp!;
$js = qr!$bh|$qq|$com|$reg!;

%lang = ();
for $file (@files) {
	print "$file\n";

	if($file !~ /\.(\w+)$/) { die "Файл $file без расширения\n"; }
	elsif($1 eq "php") { $regexp = $sh; $fn = $fn_code; }
	elsif($1 eq "js") { $regexp = $js; $fn = $fn_code; }
	elsif($1 eq "html" or $1 eq "htm") { $regexp = qr`<!--.*?-->|([^<>"']+)|"([^"]*)"|'([^']*)'/s`; $fn = $fn_html; }
	else { die "Файл $file имеет неизвестное расширение\n"; }
	
	$_ = readfile($file);
	@pos = ();
	push @pos, pos while /\n/g;
	$i = 0;
	for(; /$regexp/g;) {
		$pos = pos;
		$s = $1 // $2 // $3;
		next unless $s =~ /[\x80-\xFF]/;
		$fn->();
		$s =~ s/^\s*(.*?)\s*$/$1/;
		tostring($s);
		
		for(; $i<@pos && $pos[$i]<$pos; $i++) {}
		$p = "$file:".($i+1);
		if(not exists $lang{$s}) { $lang{$s} = [$p]; }
		else { push @{$lang{$s}}, $p; }
	}
}

for $path (glob("locale/*.po")) {
	$st = readlang($path);
	joinlang($st, \%lang);
	writelang($path, $st);
}

# считывает файл
sub readfile {
	local *f;
	open f, "<", @_ or die "Не открывается файл @_. $!\n";
	read f, my $buf, -s f;
	close f;
	return $buf;
}

# превращает в строку
sub tostring {
	$_[0] =~ s/['"]/\\$&/g;
	$_[0] = "\"$_[0]\"";
}

# читает файл в формате *.po
sub readlang {
	local ($_, $`, $', $&, $1);
	my ($file) = @_;
	my $a = {pos => [], com => []};
	my $st = {};
	open my $f, "<", $file or die "Не открыть файл $file. $!\n";
	for(my $i = 1; <$f>; $i++) {
		s/\s*$//;
		if($_ eq '') {}
		elsif(/^#:\s+([^:]+:\d+)$/) { push @{$a->{pos}}, $1 }
		elsif(/^#.*$/) { push @{$a->{com}}, $& }
		elsif(/^msgid\s+("(?:\\"|[^"])*")$/) { $a->{msgid} = $1 }
		elsif(/^msgstr\s+("(?:\\"|[^"])*")$/) {
			$a->{msgstr} = $1;
			die "Файл `$file` повреждён - нет msgid перед msgstr. Строка $i\n" unless defined($id = $a->{msgid});
			$st->{$id} = $a;
			$a = {pos => [], com => []};
		} else { die "Файл `$file` повреждён. Строка $i\n" }
	}
	die "msgid без msgstr. Строка $i\n" if defined $a->{msgid};
	close $f;
	return $st;
}

# объединяет то что было и что будет
sub joinlang {
	my ($st, $lang) = @_;
	while(($msgid, $pos) = each %$lang) {
		my $a = $st->{$msgid};
		if(defined $a) { $a->{pos} = $pos; }
		else { $st->{$msgid} = {msgid => $msgid, pos => $pos, msgstr => '""' } }
	}
	
	# удаляем уже ненужные
	while(($msgid, $pos) = each %$st) {
		delete $st->{$msgid} unless exists $lang->{$msgid};
	}
}

# дополнительно выводит в *.po.s для поледующего перевода
$file_temp = '';
$file_fp_temp = '';
sub writes {
	my ($a, $file) = @_;
	local ($_, $`, $', $&, $1);
	if($file_temp ne $file) {
		open $file_fp_temp, ">", "$file.s" or die "Не открыть файл $file.s. $!\n";
		$file_temp = $file;
	}
	$_ = $a->{msgid};
	s/^"(.*)"$/$1/;
	s/\\"/"/g;
	print $file_fp_temp "$_\n";
}

# записывает в файл
sub writelang {
	my ($file, $st) = @_;
	open my $f, ">", $file or die "Не открыть файл $file. $!\n";
	my ($a1, $a2, $b1, $b2);
	for my $a (sort { $a->{pos}[0]=~/:/; ($a1, $a2)=($`,$'); $b->{pos}[0]=~/:/; ($b1, $b2)=($`,$'); $a1 eq $b1? $a2 <=> $b2: $a1 cmp $b1 } values %$st) {
		print $f join("\n", @{$a->{com}})."\n";
		print $f join("", map { "#: $_\n" } @{$a->{pos}});
		print $f "msgid $a->{msgid}\n";
		print $f "msgstr $a->{msgstr}\n\n";
		writes($a, $file);
	}
	close $f;
}