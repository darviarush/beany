open f, "country.html" or die $!;
open u, ">country_down.sh" or die $!;
mkdir "flags";

while(<f>) {
	$url = $1 if /class="flagicon".*?src="([^"]+)".*?title="([^"]+)"/;
	if(if m!^<td>([A-Z]{2})</td>$!) {
		$i++;
		print u "wget -O $1.png -o 1 --user-agent=\"Mozilla/5.0 (Windows NT 5.1; rv:10.0.2) Gecko/20100101 Firefox/10.0.2\" http:$url\n";
	}
}

print "\nВсего: $i\n";