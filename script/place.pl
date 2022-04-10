# создаёт файлы для загрузки стран, регионов, городов и места (таблицы: country, region, city, place).

open f, "phone.txt" or die $!;	# 
while(<f>) {
	($A2, $A3, $tmp, $name, $code) = split "\t";
	$A2 = lc $A2;
	$code =~ s/\s+$//;
	$phone{$A2} = $code;
}

open f, "005-language.json" or die $!;	# из conf проекта
while(<f>) {
	$id = $1 if /"id": (\d+)/;
	$lang{$1} = $id if /"code": "([^"]+)"/;
}
$en = $lang{en};
print "en=$en\n";

open f, "country.txt" or die $!;					# http://www.artlebedev.ru/tools/country-list/tab/
open u, ">", "001-country.txt" or die $!; print u "id,alpha2,code,mask\n1,'ru','+7','(999) 999-99-99'\n2,'ua','+380','(999) 999-999'\n3,'by','+32','(99) 999-99-99'\n";
open r, ">", "002-region.txt" or die $!; print r "id,country_id\n";
open c, ">", "003-city.txt" or die $!; print c "id,region_id,latitude,longitude\n";
open p, ">", "006-place.txt" or die $!; print p "id,language_id,name,cid,type\n";
print scalar <f>; # пропускаем 1-ю строку с титлами
$type = 0;
%country = ('ru'=>1, 'ua' => 2, 'by' => 3);
$place_id = 1;
$cid = 1; $name = 'Russian Federation'; print_place();
$cid = 2; $name = 'Ukraine'; print_place();
$cid = 3; $name = 'Belarus'; print_place();
$i = 3;
while(<f>) {
	@x = split "\t";
	$name = $x[2];
	$alpha2 = lc $x[3];
	next if $alpha2=~/ru|ua|by/;
	$country{$alpha2} = ++$i;
	print u "$i,'$alpha2','$phone{$alpha2}',''\n";
	
	$cid = $i;
	print_place();
}

$place_id = $i+1;

sub print_place {
	$name =~ s/'/\\'/g;
	print p "$place_id,$en,'$name',$cid,$type\n";
	$place{"$cid,$type"}++;
	$place_id++;
}

open f, "maxmind-region-codes.csv" or die $!; # http://dev.maxmind.com/static/maxmind-region-codes.csv - перевести в utf8  из latin1: iconv -f ISO-8859-1 -t utf-8
binmode f;
$i = 1;
$type = 1;
while(<f>) {
	($alpha2, $region, $name) = split ",";
	$alpha2 = lc $alpha2;
	$alpha2 = "nl" if $alpha2 eq "an";
	$name =~ s/^"(.*)"\s*$/$1/;
	print r "$i,$country{$alpha2}\n";
	$region_id{"$alpha2$region"} = $cid = $i;
	print_place();
	$i++;
}
close f;
$region_id_next = $i;

open f, "worldcitiespop.txt" or die $!;		# http://www.maxmind.com/download/worldcities/ перевести из latin1 в utf8: iconv -f ISO-8859-1 -t utf-8 worldcitiespop.txt > worldcitiespop1.txt
binmode f;
print scalar <f>; # пропускаем 1-ю строку с титлами
$type = 2;
while(<f>) {
	s/\s*$//;
	($alpha2, $tmp, $name, $region, $population, $latitude, $longitude) = split ",";
	next if $alpha2 eq "zr";
	$alpha2 = "nl" if $alpha2 eq "an";
	
	$region_id = $region_id{"$alpha2$region"};
	unless($region_id) {
		$r{"$alpha2$region"} = $_;
		print r "$region_id_next,$country{$alpha2}\n";
		$region_id = $region_id{"$alpha2$region"} = $region_id_next++;
	}
	
	if($cc ne $alpha2) {
		$cc = $alpha2;
		print "$cc\n";
	}
	
	$noalpha{$alpha2} = 1 unless $country{$alpha2};

	$city_count{"$alpha2$region"}++;
	
	$cid = ++$city_id;

	print c "$cid,$region_id,$latitude,$longitude\n";

	print_place();
}

@k = sort values %city_count;
print "max_region_city=".$k[$#k]."\n";

print "$_\n" for keys %noalpha;

while(($a, $b) = each %place) {
	print "$a --> $b\n" if $b>1;
}

open f, ">out_1" or die $!;
@a = ();
while(($a, $b) = each %r) {
	push @a, "$a ==> $b\n";
}
print f sort @a;