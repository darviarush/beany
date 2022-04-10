<?php

/**
Контроллеры приложения
**/



$controllers->add([
	"head" => [
		desc => "формирует заголовок html",
		access => "all",
		param => [],
		func => function($param, $argv) {
			$data = [];
			foreach(["language", "form"] as $tab) {
				$data[strtoupper($tab)] = arrayToRows(R::getAll("select * from \"$tab\" order by id"));
			}
			$session = $argv->session;

			$ret = ["login"=>["sess" => $session->hash, "user_id" => $session->user_id], "DATA"=>$data];

			$this->app->trigger("index.html", $ret);
			return $ret;
		}
	],
	"index" => [
		desc => "формирует index.html",
		access => "all",
		param => [],
		func => function($param, $argv) {
			$ret = [];
			# определяем язык
			$lang = get_lang($argv);
			$ret["lang"] = $code = $lang->code;
			if(!isset($argv->cookie["lang"])) $argv->OUTHEAD["Set-Cookie"] = "lang=$code; path=/";

			# определяем город или хотя бы страну
			$place_id = $geo = $argv->cookie["geo"];
			if(isset($place_id)) $place_id = R::getCell("select $place_id from place where id = $place_id");
			if(!$place_id) {
				$ip = ip2maxmind($argv->HEAD["X-Real-IP"]);
				//$ip = ip2maxmind("212.116.103.130");
				foreach(["and locid>243", ""] as $where) {
					$sql = "select id from place where locid=(select locid from block where $ip between startipnum and endipnum $where limit 1)";
					$place_id = R::getCell($sql);
					if($place_id) break;
				}
			}

			if($place_id) {
				$sql = "select 
(select name from placen where place_id=country_id order by language_id<>{$lang->id}, language_id<>4 limit 1) as country,
(select name from placen where place_id=region_id order by language_id<>{$lang->id}, language_id<>4 limit 1) as region,
(select name from placen where place_id=vicinity_id order by language_id<>{$lang->id}, language_id<>4 limit 1) as vicinity,
(select name from placen where place_id=city_id order by language_id<>{$lang->id}, language_id<>4 limit 1) as city,
id, country_id, region_id, vicinity_id, city_id,rp5_id, place.counter_realty as count,
array_to_string(array(SELECT language.code FROM language_rp5, language where place.rp5_id=language_rp5.rp5_id and language.id=language_id),',') as lang,
(select 1 from metro where metro.place_id=city_id limit 1) as is_metro
from place where id=$place_id";
				$place = R::getRow($sql);
			}
			
			if(!$place) $place = [country => "Россия", region => "", vicinity => "", city => 'Санкт-Петербург', id => ($place_id=16130), country_id => 5, region_id => null, vicinity_id => null, city_id=>16130, name => "Санкт-Петербург"];
			
			$ret["place"] = $place;
			if(!$geo) $argv->OUTHEAD["Set-Cookie"] = "geo=$place_id; path=/";
			
			$sql = "select realty.id id from realty	order by id desc limit 12";
			$ids = R::getCol($sql);
			$sql = "select realty.id as id, 
					(select name from placen where placen.place_id=realty.place_id order by language_id<>{$lang->id} limit 1) as city,
					(select img_id from img_realty where realty_id=realty.id order by id limit 1) as img_id,
					case currency.left when 1 then symbol else '' end as left_cur,
					case currency.left when 0 then symbol else '' end as right_cur,
					round(cena*(case when realty.currency_id=1 then 1 else c_e.value end)/1) cena,
					(pos-1) % 17 * 22 as flag_x,
					(pos-1) / 17 * 15 as flag_y,
					number_room, number_bed
					from realty
						left join (select value, currency_id c_id from exchange e where e.id in (select max(id) from exchange group by currency_id)) c_e on c_e.c_id=realty.currency_id
						left join currency on currency.id = ?
						left join place on place.id=place_id
						left join country on country_id=country.id
					where realty.".get_ids_list($ids);
			
			$arr = R::getAll($sql, [1]);
			# сортировка по ids
			order_ids($ids, $arr);
			
			foreach($arr as &$a) {
				$img_id = &$a["img_id"];
				$img_id = $img_id? "/i/".to_radix($img_id, 62, "/")."2.jpg": '/theme/images/empty2.png';
			}
			
			$ret["realtyList"] = $arr;
			
			return $ret;
		}
	],
	"html" => [
		desc => "возвращает html-ку",
		access => "all",
		param => [path=>"string"],
		func => function($param, &$argv) {
			$argv->controller_name = $param->path;
			return [];
		}
	],
	"load_tests" => [
		desc => "возвращает *Test.html и *Test.js для всех плагинов",
		access => "all",
		param => [],
		func => function($param, &$argv) {
			$F = $argv->param["F"];
			if($F) $F = split(",", $F); else $F = [];	# список crc путей файлов
			$set = [];
			foreach($F as $f) $set[$f] = 1;
			$argv->F = $set;
			
			foreach($argv->app->plugins->sort_names() as $plugin) {
				$path = "plugin/$plugin/{$plugin}Test";
				if(!isset($argv->F[crc32("$path.html")])) $html .= "\n<div id=plugin-$plugin>\n<link $path.html>\n</div>\n";
				$html .= "<link $path.js>\n";
			}
			
			$html = $argv->app->controllers->build_tmpl($html);
			$x = [];
			$cf = "\$c = \$argv->app->controllers; \$ret = array_merge(['$html']);";
			eval($cf);
			
			
			$keys = array_keys($argv->F);
			#foreach($keys as &$key) $key = "0x".sprintf("%X", $key);
			$ret[] = "\n<script>\napp.page.append(".join(",", $keys).")\n</script>\n";		# добавляем crc сумму инклудов
			$argv->OUTHEAD["Content-Type"] = "text/html; charset=utf-8";
			
			unset($argv->param["F"]);
			
			return join("", $ret);
		}
	],
	"plugins" => [
		desc => "возвращает список плагинов",
		access => "all",
		param => [],
		func => function($param, $argv) {
			return $argv->app->plugins->getNames();
		}
	],
	"controllers" => [
		desc => "возвращает список контроллеров из базы",
		access => "all",
		param => [],
		func => function($param, $argv) {
			return R::find("control", "true order by name");
		}
	],
	"many" => [
		desc => "запускает несколько контроллеров",
		access => "all",
		param => ["list"=>"json"],
		func => function($param, $argv) use ($controllers) {
			$ret = [];
			foreach($param->list as $list) {
				$argv->url = "/api/".$list->url;
			$argv->param = (array) $list->param;
				$ret[] = $controllers->controllerRun($argv);
			}
			return $ret;
		}
	],
	"auth" => [
		desc => "проверяет - доступен ли указанный контроллер",
		access => "authall",
		param => [url=>"string"],
		func => function($param, $argv) {
			return $argv->session->auth($param->url);
		}
	],
	"login" => [
		desc => "выполняется после загрузке клиента, если есть сессия",
		access => "authall",
		param => [],
		func => function($param, $argv) use ($controllers) {
			$session = $argv->session;
			$menuAdmin = $controllers->menuAdmin; // Меню для админов
			$menuUser = $controllers->menuAllUser;//Меню для залогининых пользователей
			$menuUser = get_menu_on_session($session, $menuUser, $menuAdmin);
			$menu = create_menu($menuUser);
			return [
				sess => $session->hash,
				user_id => $session->user_id,
				menu => get_menu($menu)
			];
		}
	],
	"get_menu" => [
		desc => "выполняется после при загрузке подменю",
		access => "authall",
		param => ["path"=>"array_v"],
		func => function($param, $argv) use ($controllers) {
			$session = $argv->session;
			$role = $session->user->sharedRole;
			
			$menuAdmin = $controllers->menuAdmin;
			$menuUser = $controllers->menuAllUser;
			$menuUser = get_menu_on_session($session, $menuUser, $menuAdmin);
			$m = create_menu($menuUser);
			foreach($param->path as $value) {
				$m = &$m[$value];
			}
			return get_menu($m);
		}
	],
	"get_ref" => [
		desc => "выполняется при загрузке справочника",
		access => "authall",
		param => ["path"=>"array_v"],
		func => function($param, $argv) use ($controllers) {
			//var_dump($param->path);
			return $controllers->menuInfo[join(" → ", $param->path)];
		}
	],
]);


function create_menu($menuUser) {
	$menu = array();
	foreach($menuUser as $item) {
		$m = &$menu;
		foreach ($item as $value){
			if(!isset($m[$value])) {
				$m[$value] = [];
			}
			$m = &$m[$value];
		}
	}
	return $menu;
}

function get_menu_on_session($session, $menuUser, $menuAdmin){
	$role = $session->user->sharedRole;
	if ($role) {
		foreach($role as $key => $value){
			while(list($key, $val) = each($value)){
				if(is_array($val))
					if (isset($val["name"])&&($val["name"]=='Администраторы'))
						$menuUser = array_merge($menuUser, $menuAdmin);	
			}
		}
	}
	return $menuUser;
}

function get_menu($arr){
	$menu = [];	
	foreach ($arr as $key => $value) {
		$menu[$key] = $value ? 0 : 1;
	}
	return $menu;
}