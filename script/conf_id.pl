#!/usr/bin/env perl

# переписывает id (последовательный инкремент) в указанном файле в директории conf

$path = "conf/$ARGV[0]";
open f, $path or die "not open $path. $!\n";
binmode f;

$i = 1;
while(<f>) {
	$i++ if s/("id":\s+)\d+/$1$i/;
	push @x, $_;
}

close f;
open f, ">", $path or die "not open $path. $!\n";
binmode f;
print f "@x";
close f;

print "$i\n";