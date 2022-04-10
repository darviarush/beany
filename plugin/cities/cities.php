<?php

/**
Cities - это плагин для отображения городов, как на http://rp5.ru/map/0/0/0/ru
*/

$controllers->add([
	"cities/load" => [
		desc => "загружает города в указанном регионе",
		access => "all", 
		param => [country_id=>"nuint", region_id=>"nuint", vicinity=>"nuint"],
		func => function($param, $argv) {
			$lang = get_lang_id($argv);
			$field = "country";
			# для стран и для районов возращаем список стран или регионов к ним по три города
			
			if ($param->country_id) {
				$field = "region";
				$where = "and country_id = ?";
				$where_or = "or (region_id is null and vicinity_id is not null)";
				$where_query = "or city.vicinity_id=p.id";
				$arr = [$param->country_id];
			} 
			$sql = "select  t.".$field."_id id, pn1.name \"name\", t.city_id city_id, pn2.name city, pn2.counter_realty counter_realty
						from (
								select p.id ".$field."_id, unnest(array( select city.id 
																			from place city 
																			where (city.".$field."_id=p.id $where_query) and city.id=city.city_id 
																			order by city.counter_realty desc limit 3)) city_id
								from (select id from place where (".$field."_id=id $where_or) $where) p 	
							) t
						left join placen pn1 on pn1.place_id = t.".$field."_id and pn1.language_id=?
						left join placen pn2 on t.city_id = pn2.place_id and pn2.language_id=?
						where pn1.name is not null";
			
			if ($param->region_id) {	# возращаем районы и те города который не принадлежат районам, но принадлежат этому региону
				$field = "vicinity";
				$where = "and region_id = ?";
				$arr = [$param->region_id, $param->region_id];
				$sql = "select  t_c.id id, pn1.name \"name\", t_c.city_id city_id, pn2.name city, pn2.counter_realty counter_realty
						from (
							select top_city.id id, top_city.city_id
							from (	
								select p.id id, unnest(array( select city.id
										from place city
										where city.{$field}_id=p.id and city.id=city.city_id
										order by city.counter_realty desc limit 3
										)
										) city_id
								from (select id from place where ({$field}_id=id or {$field}_id is null)  $where) p
								union
									select p2.region_id id, p2.id city_id
									from (select region_id, id from place where id<>region_id $where and {$field}_id is null 
									order by counter_realty desc limit 3) p2
							) top_city ) t_c
						left join placen pn1 on pn1.place_id = t_c.id and pn1.language_id=?
						left join placen pn2 on t_c.city_id = pn2.place_id and pn2.language_id=?
						where pn1.name is not null 
						order by id";	
			}
			$arr[] = $lang;
			$arr[] = $lang;
			if ($param->vicinity){	# возращаем города и количество квартир
				$field = "city";
				$where = "and vicinity_id = ?";
				$arr = [$param->vicinity, $lang];
				$sql = "select p.id id, pn.name \"name\", p.counter_realty counter_realty, p.counter_realty counter_realty
						from place p, placen pn 
						where p.vicinity_id = ? and p.city_id = p.id and pn.language_id = ? and pn.place_id=p.id";
			}
			
			$ret = R::getAll($sql, $arr);			
			return arrayToRows($ret);
		}
	]
]);
