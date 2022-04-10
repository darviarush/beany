<?php

/**
Protocol - это плагин для отображения в панели вкладки "протокол"
*/

$controllers->add([
	"protocol/load" => [
		desc => "Возвращает список действий произведённых пользователем",
		access => "authall", 
		param => [offset => "offset", limit => "limit", order => "order_by"],
		func => function($param, $argv) {
			$ids = prepare_get_list("protocol", ["user_id=".$argv->session->user->id], $param);
			if(!$ids) return [];
			$arr = R::getAll("select p.id as id, status, modtime, p.param as param, \"desc\"
			from protocol p left join control on control_id=control.id
			where p.".get_ids_list($ids).$param->order);
			return arrayToRows($arr);
		}
	]
]);
