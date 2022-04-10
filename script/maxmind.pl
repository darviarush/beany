$av = $ARGV[0];

use DBI;

$ini = {			# конфигурация базы данных
	DNS => 'dbi:Pg:dbname=base1;host=localhost;port=5432', 
	user => 'user1',
	password => 'siKsta'
};

$dbh = DBI->connect($ini->{DNS}, $ini->{user}, $ini->{password}, {RaiseError => 1, PrintError => 0, PrintWarn => 0});
$dbh->do("SET NAMES 'utf8'");



qq{
$sql = "select country from location left join country on country.alpha2 = country
where region = '' and city = '' and country.alpha2 is null
order by country";
$alpha2 = $dbh->selectcol_arrayref($sql);


$place_id = $dbh->selectcol_arrayref("insert into place(country_id) values ".join(",", map({"(null)"} @$alpha2))." returning id");

$dbh->do("insert into country (id, alpha2) values ".join(",", map { "(".$place_id->[$_].",'".$alpha2->[$_]."')" } 0..$#$place_id));

$dbh->do("insert into placen (place_id, name, language_id) select id, alpha2, 4 from country where id>1000");
};

$sql = "select place_id, locid 
from location inner join placen on name=city
inner join country on country=alpha2";

$map = $dbh->selectall_hashref();