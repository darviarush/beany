<?php

/**
Elect - это плагин для избранных квартир пользователя
*/
function addElect($user, $realty){
	$count = R::getCell("select count(1) from elect where user_id=? and realty_id=?", [$user->id, $realty->id]);
	if (!(int) $count){
		$elect = R::dispense("elect");
		$elect->user = $user; 
		$elect->realty = $realty; 
		R::store($elect);
	}
}

$controllers->add([
	"elect/list/load" => [
		desc => "загружает список избранных квартир пользователя",
		access => "all",
		param => [offset=>"offset_by", limit=>"limit_by", "currency"=>"uint"],
		func => function($param, $argv) {
			$list = R::getCol("select max(id) from exchange group by currency_id");
			$lang = get_lang_id($argv);
			if ($param->currency==1) $cur = 1;
			if ($argv->session->user_id) {
				$realty = "(select r.* from elect e, realty r where e.realty_id=r.id and e.user_id = ?)";
				$arr = [$argv->session->user_id, $param->currency];
			} else {
				$str = $argv->cookie["elect"];
				$ids = json_decode(urldecode($str));
				$realty = "(select r.* from realty r where r.".get_ids_list($ids).")";
				$arr = [$param->currency];
			}
			$sql = "select r_e.id as id, address, number_room, number_bed, equipment, 
					(select name from placen where placen.place_id=r_e.place_id order by language_id<>$lang limit 1) as city,
					(select iname from name, namen where metro.name_id=name.id and namen.name_id=name.id order by language_id<>$lang limit 1) as metro,
					(select img_id from img_realty where realty_id=r_e.id order by id limit 1) as img_id, currency.name currency,
					round(cena*(case when r_e.currency_id=1 then 1 else c_e.value end)/$cur) cena
					from $realty r_e
					left join metro on metro.id=metro_id
					left join (select value, currency_id c_id from  exchange e where e.".get_ids_list($list).") c_e on c_e.c_id=r_e.currency_id
					left join currency on currency.id = ?";
			$res = R::getAll($sql, $arr);
			return arrayToRows($res);
		}
	],
	"elect/save" => [
		desc => "добавляет квартиру в список избранных",
		access => "authall",
		param => [id=>"uint"],		# id квартиры
		func => function($param, $argv) {
			$user = $argv->session->user;
			if ($param->id){
				addElect($user, R::load("realty", $param->id));
			} else {
				$str = $argv->cookie["elect"];
				$arr = json_decode(urldecode($str));
				if (count($arr)) foreach($arr as $value){ addElect($user, R::load("realty", $value));}
			}
			$ret = R::getCell("select count(1) from elect where user_id=?", [$user->id]);
			return $ret;
		}
	],
	"elect/erase" => [
		desc => "удаляет квартиру из списка избранных",
		access => "authall",
		param => [id=>"id"],	# id квартиры
		func => function($param, $argv) {
			$res = R::findOne("elect", "user_id=? and realty_id=? ", [$argv->session->user->id, $param->id]);
			R::trash($res);
			return [];
		}
	]
]);
