<?php

/**
Map - это плагин для карты Яндекса с объектами недвижимости
*/

$controllers->add([
	"map/store" => [
		desc => "добавляет город регион и районы",
		access => "self",
		model => "realty",
		param => ["alpha2"=>"string", "country" => "string", "region" => "string", "vicinity"=> "string", "city" => "string", "district"=>"string", "metro"=>"string"],
		func => function($param, $argv) {
			$ret = [];
			$lang = 1;// ИСПРАВИТЬ КОГДА ПОЯВИТСЯ LANG_ID
			$params = [id => $argv->model->id, address => $argv->model->address, time_change => (int) $argv->model->time_change, longitude=> $argv->model->longitude, latitude => $argv->model->latitude];
			var_dump($params);
			$arr = [$param->city, $country_id];
			if ($param->alpha2 != "" || $param->country != ""){
				$alpha2 = $param->alpha2;
				if ($alpha2 != "")
					$country = R::findOne("country", "lower(alpha2) = lower(?)", [$param->alpha2]);
				if ($param->country != ""){
					$country_id = R::getCell("select p.id pid from placen pn, place p where lower(pn.name)=lower(?) and pn.place_id = p.id and p.id=p.country_id and pn.language_id = 1", [$param->country]);
					if ($country_id)
						$country_p = R::load("place", $country_id);
				}
				if (!$country_id){
					$country_new = R::dispense("place");
					$country_new->is = false;
					R::store($country_new);
					$country_id = $country_new->id;
					$country_p = R::load("place", $country_id);
					$country_p->country = $country_new;
					R::store($country_p);
					$placen = R::dispense("placen");
					$placen->name = $param->country;
					$placen->place = $country_p;
					$placen->language_id = 1;
					R::store($placen);
					$new_country = true;
				}
				if (!$country)
					R::exec("insert into country (id, alpha2) values($country_id, '".$alpha2."')");
				if ($country && $new_country)
					R::exec("update country set id = $country_id where alpha2 = '".$alpha2."'");
				if ($country_id) {
					$where = [$param->region, $country_id];
					if ($param->region !=''){// добавляем регион
						$region = R::getCell("select p.id id from (select place_id from placen where lower(name) like lower(?) and language_id = 1) m inner join place p on  p.region_id = m.place_id and country_id = ? and id=region_id", $where);
						if(!$region){
							$region_new = R::dispense("place");
							$region_new->is = false;
							$region_new->country = $country_p;
							R::store($region_new);
							$region  = R::load("place", $region_new->id);
							$region->region = $region_new;
							R::store($region);
							$placen = R::dispense("placen");
							$placen->name = $param->region;
							$placen->place = $region;
							$placen->language_id = 1;
							R::store($placen);
						} else {
							$region = R::load('place', $region);
						}	
						$where[] = $region->id;
						$region_w = "region_id = ?";
					} else {
						$region_w = "region_id is null";
						$region = null;
					}
					if ($param->vicinity != ''){ // добавляем район
						$where[0] = $param->vicinity;
						$vicinity = R::getCell("select p.id id from (select place_id from placen where lower(name) like lower(?) and language_id = 1) m inner join place p on  p.vicinity_id = m.place_id where country_id = ? and $region_w and city_id is null and p.id=p.vicinity_id", $where);
						if(!$vicinity){
							$vicinity_new = R::dispense("place");
							$vicinity_new->is = false;
							$vicinity_new->country = $country_p;
							if ($region){ 
								$vicinity_new->region = $region;
							}
							R::store($vicinity_new);
							$vicinity  = R::load("place", $vicinity_new->id);
							$vicinity->vicinity = $vicinity_new;
							R::store($vicinity);
							$placen = R::dispense("placen");
							$placen->name = $param->vicinity;
							$placen->place = $vicinity;
							$placen->language_id = 1;
							R::store($placen);
						} else {
							$vicinity = R::load('place', $vicinity);
						}
						$where[] = $vicinity->id;
						$vicinity_w = "vicinity_id = ?";
					} else {
						$vicinity_w = "vicinity_id is null";
						$vicinity = null;
					}
					if ($param->city != ''){ // добавляем город
						$where[0] = $param->city;
						$city_id = R::getCell("select p.id id from (select place_id from placen where lower(name) like lower(?) and language_id = 1) m inner join place p on  p.city_id = m.place_id where country_id = ? and $region_w and $vicinity_w and p.id=p.city_id", $where);
						if(!$city_id){
							$city_new = R::dispense("place");
							$city_new->is = false;
							$city_new->country = $country_p;
							if ($region)
								$city_new->region = $region;
							if ($vicinity)
								$city_new->vicinity = $vicinity;
							R::store($city_new);
							$city = R::load("place", $city_new->id);
							$city->city = $city_new;
							R::store($city);
							$placen = R::dispense("placen");
							$placen->name = $param->city;
							$placen->place = $city;
							$placen->language_id = 1;
							R::store($placen);
						} else {
							$city = R::load('place', $city_id);
						}
						$ret["city"] = ["id" => $city->id, "name" => $param->city];
						$params[place_id] = $city->id ? $city->id : $city_id;
					}
					if ($param->district !="" && $city){
						$district_id = R::getCell('select d.id id from district d, namen n where lower(n.iname) like lower(?) and d.name_id=n.name_id and d.place_id=? and n.language_id = 1', [$param->district, $city->id]);
						if (!$district_id){
							$name = R::dispense("name");
							R::store($name);
							$namen = R::dispense("namen");
							$namen->name = $name;
							$namen->iname = $param->district;
							$namen->language_id = 1;
							R::store($namen);
							$place = R::load('place', $city->id);
							$district = R::dispense("district");
							$district->name = $name;
							$district->place = $place;
							R::store($district);
						}
						$params[district_id] = $district->id ? $district->id : $district_id;
					} else {$params[district_id] = null;}
					if ($param->metro !="" && $city){
						$metro_id = R::getCell('select m.id id from metro m, namen n where lower(n.iname) like lower(?) and m.name_id=n.name_id and m.place_id=? and n.language_id = 1', [$param->metro, $city->id]);
						if (!$metro_id){
							$name = R::dispense("name");
							R::store($name);
							$namen = R::dispense("namen");
							$namen->name = $name;
							$namen->iname = $param->metro;
							$namen->language_id = 1;
							R::store($namen);
							$place = R::load('place', $city->id);
							$metro = R::dispense("metro");
							$metro->name = $name;
							$metro->place = $place;
							R::store($metro);
						}
						$params[metro_id] = $metro->id ? $metro->id : $metro_id;
					} else {$params[metro_id] = null;}
				}
			}
			if ($city){
				$arr = $argv->app->controllers->lightRun("realtyList/md/load", $argv, [id => $city->id]);
				$ret["metro_sel"] = $arr["metro_sel"];
				$ret["district_sel"] = $arr["district_sel"];
			} else {
				$ret["city"] = ["id" => 0, "name" => ""];
				$ret["metro_sel"] = $ret["district_sel"] = [];
			}
			$arr = $argv->app->controllers->lightRun("realtyList/store", $argv, $params);
			$ret["time_change"] = $arr['time_change'];		
			return $ret;
		}
	]
]);