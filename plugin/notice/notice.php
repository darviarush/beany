<?php

/**
Notice - это плагин для уведомлений пользователей
*/

$controllers->add([
	/************************************ notice ************************************/
	"notice/store" => [
		desc => "сохраняет данные для отправки уведомлений",
		access => "self",
		model => "notice",
		user => ["realty", "user"],
		param => [],
		func => function($param, $argv) {
			R::store($argv->model);
			return [id=>$argv->model->id];
		}
	],
	
	"notice/selservice/store" => [
		desc => "сохраняет выбранную услугу",
		access => "self",
		model => "selservice",
		param => [],
		func => function($param, $argv) {
			$service = $argv->model;
			
			if (!$param->armoring_id) $param->armoring_id = null;
			$service->armoring_id = $param->armoring_id;
			$service->notice_id = $param->notice_id;
			$service->user_id = $argv->session->user->id;
			R::store($service);
			return [id=>$argv->model->id];
		}
	],
	
	"notice/load"=>[
		desc => "возвращает анкету по недвижимости",
		access => "all",
		param => [id => "id"],
		func => function($param, $argv) {
			$notice = R::load("notice", $param->id); 
			return $notice;
		}
	],
	"notice/service/status/load" =>[
		desc => "возращает статусы услуг на определенную дату",
		access => "authall",
		param => ["armoring" => "uint"],
		func => function($param, $argv){
			if (!$param->armoring){ $sql = "is null"; $arr = [$argv->session->user->id];}
			else  {$sql = "= ?"; $arr = [$param->armoring, $argv->session->user->id];}
			$ret = arrayToRows(R::getAll("select s.notice_id id, s.status as status from selservice s, notice n where s.armoring_id ".$sql." and n.id=s.notice_id and s.user_id = ?", $arr));
			return $ret;
		}
	],
	"notice/service/load" =>[
		desc => "возращает статусы услуг на определенную дату",
		access => "authall",
		param => ["realty_id" => "uint"],
		func => function($param, $argv){
		$balance = arrayToRows(R::getAll("select (COALESCE(b.cena,'0')||'x'||b.count_service) cena_count, COALESCE(b.cena,0)*b.count_service total, b.service service
										from 
										(select n.service service, n.id id, case s.period when 1 then 1
										when 2 then (s.fromdate-s.todate)
										when 3 then (s.fromdate-s.todate)/7
										when 4 then s.count_service
										else 0 end count_service, n.cena cena
										from selservice s, notice n
										where s.notice_id=n.id and s.user_id=? and s.status=1 and n.realty_id =? and s.armoring_id is null) b",
										[$argv->session->user->id, $param->realty_id]));
		return $balance;
		}
	],
	"notice/service/status/store" =>[
		desc => "устанавливает статус услуги",
		access => "authall",
		param => ["notice_id" =>"id", "armoring_id" => "uint", "status"=>"uint"],
		func => function($param, $argv) {
			if (!$param->armoring_id) {
				$where = 'is null';
				$arr = [$param->notice_id,  $argv->session->user->id];
				$param->armoring_id = null;
			}
			else {
				$where = '=?';
				$arr = [$param->notice_id, $param->armoring_id, $argv->session->user->id];
			}
				$id = R::getCell('select id from selservice where notice_id = ? and armoring_id '.$where.' and user_id = ? ', $arr);
			
			if (!$id){
				$selservice = R::dispense("selservice");
				$selservice->user = $argv->session->user;
				$selservice->notice_id = $param->notice_id;
				$selservice->armoring_id = $param->armoring_id;
			}
			else{
				$selservice = R::load("selservice", $id);
			}
			$selservice->status = $param->status;
			R::store($selservice);
			return [];
		}
	],
	"notice/service/time/load" =>[
		desc => "Загружает период предоставления услуг",
		access => "authall",
		param => ["notice_id" =>"id", "armoring_id" => "uint"],
		func => function($param, $argv) {
			if (!$param->armoring_id) {
				$sql="is null"; $arr = [$param->notice_id];
			}
			else { 
				$sql = "= ?"; $arr = [$param->notice_id, $param->armoring_id];
			}
			$selservice = R::findOne("selservice", "notice_id = ? and armoring_id ".$sql, $arr );
			return $selservice?$selservice->export():false;
		}
	],
	"notice/service_all/load" => [
		desc => "возвращает список услуг",
		access => "all",
		param => [limit => "limit", "name_startsWith"=>"string"],
		func => function($param, $argv) {	 
			$service = arrayToRows(R::getAll(" 
			select name
			from (select distinct service as name 
				from notice where service like ?
				union 
				select name from service where name like ?) serv
			limit ?", [$param->name_startsWith."%", $param->name_startsWith."%", $param->limit]));
			return $service;
		}
	],
	"notice/erase" => [
		desc => "удаляет данные для отправки уведомления",
		access => "self",
		model => "notice",
		user => ["realty", "user"],
		param => ["id" => "id"],
		func => function($param, $argv) {
			R::trash($argv->model);
			return [];
		}
	]
]);
