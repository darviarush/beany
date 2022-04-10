#!/usr/bin/env perl
open g, "005-country.txt" or die "xxx: $!\n";
open f, ">006-country.txt" or die $!;
mkdir "flags2";

scalar <g>;
print f "id,alpha2,code,mask,pos\n";
while(<g>) {
	chop;
	($id, $alpha2) = split /,/;
	$i++;
	if(-e "flags/$alpha2.png") {
		#$x = sprintf("flags2/%03i-$alpha2.png", $i);
		#`convert -page 22x15\! flags/$alpha2.png $x`;
		#cp("flags/$alpha2.png", sprintf("flags2/%03i-$alpha2.png", $i));
		push @x, "flags/$alpha2.png";
	} else {
		print "$i $alpha2\n"
	}
	print f "$_,$i\n";
}

`montage  -resize 22x16 -gravity center -extent 22x16 -gravity Center -background none -geometry +0+0 png:compression-level=9 @x flags4.png`;

sub cp {
	local *f;
	open f, $_[0] or die $!; binmode f;
	read f, $buf, -s f;
	close f;
	
	open f, ">$_[1]" or die $!; binmode f;
	print f $buf;
	close f;
}