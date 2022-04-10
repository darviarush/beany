<?php

/**
RealtyList - это плагин для списка недвижимости
*/

//получет курсы валют и добавляет массив в index_html
function update_index_currency($app, &$ret) {
	$curr = arrayToRows(R::getAll("select c.id, c.name, coalesce(cc.value,1) as value 
	from
	(select c.id, c.name, max(cc.date) last_date 
	from currency c left join exchange cc on c.id=cc.currency_id 
	group by c.id, c.name ) c 
	left join exchange cc on c.id = cc.currency_id and c.last_date = cc.date
	order by c.id"));
	$ret["CURRENCY"] = $curr;
}
function get_where($date_from, $date_to) {
	$where = [];
	if ($date_from) $where[] = "fromdate <= '$date_from'";
	if ($date_to) $where[] = "todate >= '$date_to'";
	if (count($where)) {
		$join = "left join (select distinct realty_id
					from armoring arm left join armperiod on armoring_id=arm.id and arm.opt = 0 
				where ".join(" and ", $where).") arm_realty on 
				arm_realty.realty_id = r.id";
		$where = "arm_realty.realty_id is null";
	}
	return ['where'=>$where, 'join'=>$join];
}

function changeCurrency(){
	return R::getCol("select max(id) from exchange group by currency_id");
}

function getCurrency($currency){
	if($currency==1) $cur = 1;
		else $cur = R::getCell("select value from exchange where currency_id=? order by id desc limit 1", [$currency]);
	return $cur;
}
$app->bind("index.html", update_index_currency);

# подгружаем шаблоны
//require_once "lib/Template.php";
//$robot_tmpl = new Template($app);
//$robot_tmpl->load(["list"=>"robot_list.html", card=>"robot_card.html"], "plugin/realtyList/");


# устанавливаем рассылку писем и sms персоналу каждый день в 12:00
$app->cron(mktime(0, 0, 0), 24*60*60, function() {
	global $app;
	$arm = R::getAll("
	select notice.realty_id as realty_id, email, phone, comment, fromdate, todate
	from armperiod
		inner join armoring on armoring_id = armoring.id
		inner join notice on notice.realty_id = armoring.realty_id
	where (todate between current_date + time '00:00' and current_date + time '23:59'
	  or fromdate between current_date + time '00:00' and current_date + time '23:59'
		)
		and (coalesce(email, '')!='' or coalesce(phone, '')!='')
	");
	foreach($arm as $a) {
		if($a['email']) $app->mail->send("cleaning", [REALTY=>$a["realty_id"], TO=>$a["email"], MSG=>$a["comment"]]);
		if($a["phone"]) $app->SMS->send($a["phone"], $a["comment"]);
	}
	
	//получаем валюту с cbr
	$content = file_get_contents("http://www.cbr.ru/scripts/XML_daily.asp");
	preg_match_all("/<Valute.*?>(.*?)<\/Valute>/ims", $content, $matches);
	preg_match("/(\d{2}).(\d{2}).(\d{4})/ims", $content, $date);
	$currency = R::getAll("select c.id, c.name, cc.date, cc.value 
							from 
							( select c.id, c.name, max(cc.date) last_date 
							from currency c left join exchange cc on c.id=cc.currency_id 
							group by c.id, c.name ) c 
							left join exchange cc on c.id = cc.currency_id and c.last_date = cc.date");
	$date = $date[3]."-".$date[2]."-".$date[1];
	foreach($matches[1] as $valute) {
		$val = [];
		preg_match("/<CharCode>(.*?)<\/CharCode>/i", $valute, $m);
		$val["code"] = $m[1];
		foreach($currency as $value) {
			if(strtolower($value["name"]) == strtolower($val["code"])){//если эта валюта указана в БД, то узнаем последние данные с cbr
				preg_match("/<Nominal>(.*?)<\/Nominal>/i", $valute, $m);
				$val["nominal"] = $m[1];
				preg_match("/<Value>(.*?)<\/Value>/i", $valute, $m );
				$val["value"] = str_replace(",", ".", $m[1]) /$val["nominal"];
				//добавляем валюту
				if ((float)$val["value"]!==(float)$value["value"]) {
					$exchange = R::dispense("exchange");
					$exchange->currency_id = $value["id"];
					$exchange->date = $date;
					$exchange->value = $val["value"];
					R::store($exchange);
				}
			}
		}
	}

	//update_index_currency(); - не нужно пока
	
}, true);

$controllers->add([
	"realtyList/list/load" => [
		desc => "возвращает список недвижимости. page - номер страницы",
		access => "all", 
		param => [page=>"nuint", offset => "nuint", limit => "nlimit10", order => "norder_by", my => "bool", 
			"metro"=>"njson", "district"=>"njson", "number_room"=>"njson", "number_bed"=>"nuint",
			"currency" =>"npositive", "equipment" => "nuint", "date_from"=>"date", "date_to"=>"date",
			"city_id"=> "nuint", "region_id" => "nuint", "country_id"=>"nuint"],
		func => function($param, $argv) {
		
			if($param->page) {			# если указан параметр page, то offset и limit - игнорируются
				$limit = 10;
				$offset = ($param->page-1) * $limit;
				$param->offset = $offset;
				$param->limit = $limit;
			}
		
			$where = [];
			$cena_from = $param->cena_from+0;
			$cena_to = $param->cena_to;
			$equipment = $param->equipment;

			$where_x = [];
			foreach([$param->date_from, $param->date_to] as $x) if($x) {
				$where_x[] = "fromdate <= '$x' and todate >= '$x'";
				$join = "left join armoring on realty_id=realty.id left join armperiod on armoring_id=armoring.id ";
			}
			if($where_x) $where[] = "(not (".join(" and ", $where_x).") or armperiod.id is null)";
			
			// квартира/комната/коттедж
			if(($form_id = (int) $param->form_id) != 0) $where[] = "form_id=$form_id";
			// в квартире есть:
			if($equipment != 0) $where[] = "equipment&$equipment=$equipment";
			
			if($cena_to != '') {
				$cena_to += 0;
				$where[] = "cena between $cena_from and $cena_to";
			} else if($cena_from) {
				$where[] = "cena >= $cena_from";
			}
			
			$lj_place = "left join place on realty.place_id=place.id ";
			
			// жильё находится в стране/городе
			if($city_id = $param->city_id) $where[] = $where_place = "realty.place_id=$city_id";
			else if($region_id = $param->region_id)  {	// региону
				$where[] = $where_place = "place.region_id=$region_id";
				$join .= $join_place = $lj_place;
			} else if($country_id = $param->country_id) {	// стране
				$where[] = $where_place = "place.country_id=$country_id";
				$join .= $join_place = $lj_place;					
			}
			
			//сортировка по удаленности от центра города
			if (preg_match('/\blocation\b/i',$param->order)) {
				$location = ",(abs(place.latitude-realty.latitude)+abs(place.longitude - realty.longitude)) as location";
				$location_group = ", place.latitude, realty.latitude, place.longitude, realty.longitude";
				if(!$join_place) $join .= $lj_place;
			}
			
			# собственные квартиры пользователя
			if($param->my) {
				if($id = $argv->session->user->id) {
					$where[] = "user_id=$id";
					
				}
				else $argv->app->controllers->logout();
			} else $where[] = "address<>''";
			
			//количество заявок у пользователя
			if($id = $argv->session->user->id) {
				$ret['application'] = R::getCell("select count(1) from armoring a, realty r where a.opt >= ? and ((a.realty_id = r.id and a.user_id = ?) or (a.realty_id = r.id and r.user_id = ?))",[4, $id, $id]);
			}
			
			# фильтр по количеству гостей - показываются квартиры, где столько кроватей, сколько указано, или больше
			if($param->number_bed) {
				$where[] = "number_bed>={$param->number_bed}";
			}
			
			//фильтр по количеству комнат
			$number_room = implode($param->number_room, ",");
			if($number_room != '') $where[] = "number_room in ($number_room)";
			//фильтр по районам
			$district = implode($param->district, ",");
			//фильтр по станциям метро
			$metro = implode($param->metro, ",");
			//фильтр если выбранны и станции метро и районы
			if ($metro != '' && $district != '') $where[] = "(district_id in ($district) OR metro_id in ($metro))";
			elseif ($district!='') $where[] = "district_id in ($district)";	//фильтр по районам
			elseif ($metro != '') $where[] = "metro_id in ($metro)";	//фильтр по метро

			//сортировка по районам и метро
			foreach ([district, metro] as $field){
				if (preg_match('/\b'.$field.'\b/i',$param->order)) 
					{${$field."_sort"} = ",".get_field($$field,$field."_id")." as ".$field;}
			}
			
			
			// 
		
			$where = $where? "where ".join(" and ", $where): "";
			
			$sql = "select id from (select realty.id id $district_sort $metro_sort $location
			from realty
			$join
			$where
			group by realty.id $location_group
			{$param->order}
			offset ? limit ?
			) t";
			
			//echo "sql {$sql}";
			
			$ids = R::getCol($sql, [$param->offset, $param->limit]);

			$lang = get_lang_id($argv);
			
			$sql = "select realty.id as id, address, number_room, number_bed, equipment, 
					(select name from placen where placen.place_id=realty.place_id order by language_id<>$lang limit 1) as city,
					(select iname from name, namen where metro.name_id=name.id and namen.name_id=name.id order by language_id<>$lang limit 1) as metro,
					(select img_id from img_realty where realty_id=realty.id order by id limit 1) as img_id, currency.name currency,
					round(cena*(case when realty.currency_id=1 then 1 else c_e.value end)/".getCurrency($param->currency).") cena
					from realty
						left join metro on metro.id=metro_id
						left join (select value, currency_id c_id from  exchange e where e.".get_ids_list(changeCurrency()).") c_e on c_e.c_id=realty.currency_id
						left join currency on currency.id = ?
					where realty.".get_ids_list($ids);
			
			$arr = R::getAll( $sql, [$param->currency]);
			# сортировка по ids
			order_ids($ids, $arr);

			$counter_room = 4;
			//заменить на количество блоков 
			$sql = "select 0 num_room, count(1)
					from realty $join
					$where and realty.number_room is not null
					group by num_room
					union
					select case when number_room<$counter_room THEN number_room else $counter_room end num_room, count(1)
					from realty $join
					$where and realty.number_room is not null
					group by num_room";
			$ret["counter_number_room"] = arrayToRows(R::getAll($sql));
			//выборка счетчиков по районам
			$sql = "select district_id id, count(1)
					from realty $join
					$where and realty.metro_id is not null
					group by district_id";
			$ret["district"] = arrayToRows(R::getAll($sql));
			
			//выборка счетчиков по метро
			$sql = "select metro_id id, count(1) count
					from realty $join
					$where and realty.metro_id is not null
					group by metro_id";
			$ret["metro"] = arrayToRows(R::getAll($sql));
		
			//счетчики по комнатам
			$sql = "select realty.number_room num_room, count(1) 
					from realty $join
					$where and realty.number_room is not null
					group by realty.number_room
					order by realty.number_room";
			$ret["number_room"] = arrayToRows(R::getAll($sql));
			
			//фильтр по количества комнат в квартирах
			if($where_place) $where_place .= " and";
			$sql = "select realty.number_room num_room
					from realty $join_place
					where $where_place realty.number_room is not null
					group by realty.number_room
					order by realty.number_room";
			$ret["filter_room"] = arrayToRows(R::getAll($sql));
			
			//получаем валюту с cbr
			if(!isset($param->F)) $arr = arrayToRows($arr);
			return [ fn => "app.exports.realty.ListFilters.updateByCounter", ret => $ret, arr=>$arr/*, currency=>$currency*/];
		}
	],
	"realtyList/load" => [
		desc => "возвращает анкету по недвижимости",
		access => "all",
		param => [currency=>"npositive", date_from=>"date", date_to=>"date"],
		func => function($param, $argv) {
			$id = $param->id;
			$realty = R::load("realty", $id); 
			if(!$realty->id) throw new Exception("Карточки недвижимости № $id не существует");

			$lang = get_lang_id($argv);
			$ret = $realty->export();
			$currency = $param->currency;
			$ret["cena_cur"] = R::getCell("select round(?*(case when ?=1 then 1 else (select value from exchange where currency_id=? order by id desc limit 1) end)	/(case when ?=1 then 1 else (select value from exchange where currency_id=? order by id desc limit 1) end))",
											[$realty->cena, $realty->currency_id, $realty->currency_id, $currency, $currency]);
			$ret["cena_month_cur"] = R::getCell("select round(?*(case when ?=1 then 1 else (select value from exchange where currency_id=? order by id desc limit 1) end) / (case when ?=1 then 1 else (select value from exchange where currency_id=? order by id desc limit 1) end))",
											[$realty->cena_month, $realty->currency_id, $realty->currency_id, $currency, $currency]);
			$ret["cur"] =  R::getCell("select name from currency where id = ?",[$currency]);
			$ret["armoring"] = exportToRows($realty->ownArmoring, ["ownArmperiod"]);

			if($argv->session->id) {
				$ret["notice"] = exportToRows($realty->ownNotice);
				$ret["armoring"] = exportToRows($realty->ownArmoring, ["ownArmperiod"]);
				$ret["date_armoring"] =  arrayToRows(R::getAll("select min(p.fromdate) fromdate, max(p.todate) todate, a.id armoring_id
																from armoring a, armperiod p 
																where a.user_id=? and a.opt=0 and a.id=p.armoring_id and a.realty_id=?
																group by a.id",[$argv->session->user->id, $param->id]));
				$ret["count_application"] = (int) R::getCell("select count(1) from armoring where realty_id=? and opt = 4",[$realty->id]);
			}
			
			$city = R::getCell('select p.name "name" from placen p where p.place_id =? order by p.language_id <> ? limit 1', [$realty->place_id, $lang]);
			$ret["city"] = $city ? $city : "";
			
			if ($argv->session->user_id == $realty->user_id) {
				if ($realty->place_id) $arr = $argv->app->controllers->lightRun("realtyList/md/load", $argv, [id => $realty->place_id]);
				$ret["metro_sel"] = $arr["metro_sel"];
				$ret["district_sel"] = $arr["district_sel"];
				#$ret["currency_sel"] = arrayToRows(R::getAll("select id, name from currency order by name"));
			}
			else {
				$ret["metro"] = get_name_by("metro", $lang, $realty->metro_id);
				$ret["district"] = get_name_by("district", $lang, $realty->district_id);
			}
			
			$ret["form"] = $realty->form->name;
			$ret["imgs"] = [];
			
			$argv->app->trigger("realty-load", $ret);
			
			//Похожие варианты квартир
			$where[] ="r.id<>{$realty->id}";
			
			if ($realty->place_id){
				$where[] = "place_id={$realty->place_id}";
			} else {
				$where[] = "place_id is null";
			}
			$res = get_where($param->date_from, $param->date_to);
			if ($res['where'] && $res['join']){
				$where[] = $res['where'];
				$join = $res['join'];
			}
			$where = $where? "where ".join(" and ", $where): "";
			$par[] = 0; $par[] =3; //ограничение вариантов
			$location = "(abs({$realty->latitude}-r.latitude)+abs({$realty->longitude} - r.longitude)) as location";
			$sql = " select id from 
( select r.id, $location,  
	r.top top, abs({$realty->cena}-round(r.cena*(case when r.currency_id=1 then 1 else c_e.value end)/".getCurrency($currency).")) abc_cena
from realty r 
	left join (select value, currency_id c_id from  exchange e where e.".get_ids_list(changeCurrency()).") c_e on c_e.c_id=r.currency_id
	$join 
$where
order by top, abc_cena, location
) t offset ? limit ?";
			
			$ids = R::getCol($sql, $par);
			
			$sql2 = "select r.id id, 
							(select img_id from img_realty where realty_id=r.id order by id limit 1) as img_path, 
							round(cena*(case when r.currency_id=1 then 1 else c_e.value end)/".getCurrency($currency).") cena
					from (select id, cena, currency_id from realty where ".get_ids_list($ids).") r 
						left join (select value, currency_id c_id from  exchange e where e.".get_ids_list(changeCurrency()).") c_e on c_e.c_id=r.currency_id";
			
			$ret["like"] = arrayToRows(R::getAll($sql2));
			return $ret;
		}
	],
	"realtyList/new" => [
		desc => "создаёт новую квартиру",
		access => "authall",
		param => ["signed"=>"bool"],
		func => function($param, $argv) {
			$user = $argv->session->user;
			if($param->signed) {
				$user->sharedRole[] = R::findOne("role", "name='Арендодатель'");
				R::store($user);
				$is = true;
			}
			else $is = R::getCell("select 1 from role_user where user_id = {$user->id} and role_id = (select id from role where name='Арендодатель')");
			if(!$is) return 0;
			$realty = R::dispense("realty");
			$realty->user = $user;
			R::store($realty);
			return $realty->id;
		}
	],
	/*"robots/list/load" => [
		desc => "лента квартир для поисковых роботов",
		access => "all",
		param => ["from_id" => "uint", lang=>"lang"],
		func => function($param, $argv) use (&$robot_tmpl) {
			$argv->OUTHEAD["Content-Type"] = "text/html; charset=utf-8";
			$limit = 1000;
			$ids = R::getCol("select id from realty where id > {$param->from_id} and address is not null order by id limit $limit");
			$next = (count($ids) == $limit);
			$langs = $argv->app->locale->langs();
			return $robot_tmpl->join("list", ["ids"=>$ids, next=>$next, from_id=>$ids[count($ids)-1], lang=>$param->lang, langs=>$langs]);
		}
	],
	"robots/load" => [
		desc => "анкета квартиры для поисковых роботов",
		access => "all",
		param => [lang=>"lang", id=>"id"],
		func => function($param, $argv) use (&$robot_tmpl) {
			$argv->OUTHEAD["Content-Type"] = "text/html; charset=utf-8";
			$lang = $param->lang;

			$id = $param->id;
			$realty = R::load("realty", $id)->export();
			if(!$realty["id"] or !$realty["address"]) return _("Страница не найдена");
			
			$imgs = R::getCol("select img_id from img_realty where realty_id=? order by id", [$id]);
			$img = [];
			foreach($imgs as $img_id) $img[] = to_radix($img_id, 64, "/")."1.jpg";
			
			$realty["img"] = $img;
			$realty["lang"] = $lang;
			$html = $robot_tmpl->join("card", $realty);
			$lang = $argv->app->locale->get($lang);
			$html = preg_replace_callback('/>([^<>]*[\x80-\xFF][^<>]*)</', function($a) use ($lang) {
				$tr = $lang[$a[1]];
				if($tr) return ">{$tr["msgstr"]}<";
				return $a[0];
			}, $html);
			return $html;
		}
	],
	"realtyList/md/load" => [
		desc => "возвращает список метро и районов в зависимости от города",
		access => "all",
		param => [id => "id"],
		func => function($param, $argv) {
			$lang = get_lang_id($argv);
			$ret["metro_sel"] = get_names_by("metro", $lang, $param->id);
			$ret["district_sel"] = get_names_by("district", $lang, $param->id);
			return $ret;
		}
	],*/
	"realtyList/city/store" => [
		desc => "сохраняет анкету по недвижимости. Если id=0 - создаёт новую",
		access => "all",
		param => [id=>"nuint", place_id=>"id", time_change=>"uint"],
		func => function($param, $argv) {
			//echo "time_change {$argv->model->time_change}";
			$params = [id => $param->id, place_id => $param->place_id, time_change => $param->time_change, metro_id => null, district_id => null];
			$arr1 = $argv->app->controllers->lightRun("realtyList/store", $argv, $params);
			$arr2 = $argv->app->controllers->lightRun("realtyList/md/load", $argv, [id => $param->place_id]);
			return array_merge($arr1, $arr2);
		}
	],
	"realtyList/store" => [
		desc => "сохраняет анкету по недвижимости. Если id=0 - создаёт новую",
		access => "self",
		model => "realty",
		param => [time_change=>"nuint"],
		func => function($param, $argv) {
			if (!$param->time_change || $param->time_change <= $argv->model->time_change) {
				$realty = $argv->model;

				if($param->place_id) place_counter($param->place_id, $realty->place_id);			# изменился город

				$realty->time_change = time();
				R::store($realty);
				return [id => $realty->id, time_change => $realty->time_change];
			} 
			# если данные были изменены за то время, пока пользователь отходил, то выдаст ошибку
			$data = $argv->app->controllers->lightRun("realtyList/load", $argv, [id => $argv->model->id, currency => $argv->model->currency_id]);
			throw new AException("Информация была изменена", 409, [ ret => $data, fn => "app.exports.realty.render"] );
		}
	],
	"realtyList/erase" => [
		desc => "удаляет анкету по недвижимости",
		access => "self",
		model => "realty",
		param => ["id" => "id"],
		func => function($param, $argv) {
			$realty = $argv->model;
			place_counter(null, $realty->place_id);
			R::trash($realty);
			return [];
		}
	],
	"realtyList/ref" => [
		desc => "выполняется при загрузке справочника",
		access => "authall",
		param => ["path"=>"string"],
		func => function($param) use ($controllers) {
			$menuInfo = $controllers->menuInfo;
			foreach ($menuInfo as $key => $value){
				if ($value["url"]==$param->path)
				{	
					return $value;
				}
			}
		}
	],
	/* deprecated ? realtyList/city/load and realtyList/place is equal
	"realtyList/city/load" => [
	desc => "автокомплитер для городов в карточке недвижимости",
	access => "all",
	param => [term=>"string", country_id=>"nuint"],
	func => function($param, $stash) {
		//$lang_id = get_lang_id($stash);

		$place = $param->place;
		
		if($param->country_id) {
			$where = "and country_id={$param->country_id}";
		}
		
		return arrayToRows(R::getAll("
		select A.count, country_id, vicinity_id, region_id, city_id,
		city.name as city, vicinity.name as vicinity, region.name as region, country.name as country
		from

		(select count(realty.id) as count, Q.*
		from (select place_id, language_id
		from placen
		inner join place on placen.place_id=place.id
		where lower(name) like lower(:term) $where and city_id is not null
		limit 15) Q
		left join realty on realty.place_id=Q.place_id
		group by Q.place_id, Q.language_id
		) A
		inner join place on A.place_id=place.id
		left join placen city on place.city_id=city.place_id and city.language_id=A.language_id
		left join placen vicinity on place.vicinity_id=vicinity.place_id and vicinity.language_id=A.language_id
		left join placen region on place.region_id=region.place_id and region.language_id=A.language_id
		left join placen country on place.country_id=country.place_id and country.language_id=A.language_id
		", [":term" => $param->term."%"]));
	}], */
	"realtyList/place" => [
		desc => "место для автокомплитера",
		access => "all",
		param => [term=>"string", country_id=>"nuint"],
		func => function($param, $stash) {
			$lang = get_lang($stash);
			
			if($param->country_id) {
				$order_by = ", country_id<>{$param->country_id}";
			}
			
			return arrayToRows(R::getAll("
select 
(select name from placen where place_id=country_id order by language_id<>{$lang->id}, language_id<>4 limit 1) as country,
(select name from placen where place_id=region_id order by language_id<>{$lang->id}, language_id<>4 limit 1) as region,
(select name from placen where place_id=vicinity_id order by language_id<>{$lang->id}, language_id<>4 limit 1) as vicinity,
(select name from placen where place_id=city_id order by language_id<>{$lang->id}, language_id<>4 limit 1) as city,
id, country_id, region_id, vicinity_id, city_id, rp5_id, count,
array_to_string(array(SELECT language.code FROM language_rp5, language where A.rp5_id=language_rp5.rp5_id and language.id=language_id),',') as lang,
(select 1 from metro where metro.place_id=city_id limit 1) as is_metro
from
(select country_id, region_id, vicinity_id, city_id, place.id as id, rp5_id, place.counter_realty as count
from placen inner join place on place_id=place.id
where lower(name) like lower(?) and place.id in (city_id, country_id)
order by place.counter_realty desc, language_id<>{$lang->id}
limit 15
) as A
", [$param->term."%"]));
		}
	]
]);

