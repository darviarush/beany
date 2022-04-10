# каждую строку locale/*.po.s записывает в locale/*.po msgstr
sub conv {
	local ($_, $', $`, $1, $&);
	$_ = $_[0];
	s/\s+$//;
	s/"/\\"/g;
	return $_;
}

@A = ($ARGV[0] or glob "locale/*.po");

for $f (@A) {
	open f, $f or die "$f: $!\n";
	open u, "$f.s" or die "$f.s: $!\n";
	binmode f, u;
	
	$s = "";
	while(<f>) {
		s/^msgstr\s+.*/"msgstr \"".conv(scalar <u>)."\""/e;
		$s .= $_;
	}
	close u, f;
	
	open f, ">", $f or die "$f: $!\n";
	print f $s;
	close f;
}