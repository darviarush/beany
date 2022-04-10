#!/usr/bin/env perl

# создаёт файлы locale/*.po на основе conf/006-language.json

open f, "conf/006-language.json" or die "not open. $!\n";
binmode f;

while(<f>) {
	if(/"code":\s+"(\w{2})"/) {
		$x{$1}++;
		$path = "locale/$1.po";
		open u, ">>", $path or die "not open $path. $!\n";
		close u;
	}
}

while(($key, $val) = each %x) {
	print "$val: $key\n" if $val > 1;
}
