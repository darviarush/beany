<?php

/**
Inform - это плагин для обработки заявок на объект недвижимости
*/
$app->cron(mktime(0, 0, 0), 12*60*60, function() {

	global $app;
	$application = R::getAll("select a.id id, a.realty_id, ac.contact contact, ac.typ typ, array_to_string(array(
											select (to_char(ap.fromdate, 'DD-MM-YYYY')||' '||to_char(ap.todate, 'DD-MM-YYYY')) armdata 
											from armperiod ap 
											where ap.armoring_id = a.id),'/') period
										from (select a.*
											from armoring a, constants c
											where a.opt = ? and a.time < ? - c.val * ? and c.id = 1) a 
										left join (select ac.user_id, ac.contact, t.name typ from account ac, \"type\" t where t.id=ac.type_id) ac
										on ac.user_id=a.user_id", [4, time(), 60*60]);
	$arm = [];
	//известить пользователя что его заявка отклонена
	$msg = "Заявка по адресу http://".$app->ini["server"]["host"]."#list=0=0=equipment=0!tab=0/realty=REALTY_ID=7 на период с PERIOD отклонена";
	//var_dump([$application, 'eraseapplication',[REALTY => '', PERIOD =>'', TO =>''], $msg]);
	if (count($application)){
		send($application, 'eraseapplication',[REALTY => '', PERIOD =>'', TO =>''], $msg);
		foreach ($application as $a) {
			$arm = R::load('armoring', $a['id']);
			$arm->opt = 6;
			$arm->time = time();
			R::store($arm);
		}
	}
	
	// удаляем подтверждение заявок
	$confirm_app = R::getAll("select a.*, ac.contact contact, t.name typ, array_to_string(array(
								select (to_char(ap.fromdate, 'DD-MM-YYYY')||' '||to_char(ap.todate, 'DD-MM-YYYY')) armdata 
								from armperiod ap 
								where ap.armoring_id = a.id),'/') period
							from armoring a, constants c, realty r, account ac, \"type\" t
							where a.opt = ? and a.time < ? - c.val * ? and c.id = 1 and a.realty_id=r.id and r.user_id=ac.user_id and t.id=ac.type_id", [5, time(), 60*60]);				
	$msg = "Подтверждение заявки по адресу http://".$app->ini["server"]["host"]."#realty=REALTY_ID на период с PERIOD отклонено";
	
	send($confirm_app, 'eraseverifiedappl',[REALTY => '', PERIOD =>'', TO =>''], $msg);

	if (count($confirm_app)){
		$arm = [];
		foreach ($confirm_app as $a) {
			$arm = R::load('armoring', $a['id']);
			$arm->opt = 7;
			$arm->time = time();
			R::store($arm);
		}
	}
}, true);

function send($contact, $mail, $msg_mail, $msg) {
	global $app;
	foreach ($contact as $a) {
		if($a['typ'] === 'email') {
			if (isset($a['contact'])){
				$msg_mail[TO] = $a['contact'];
			}
			if (isset($a['realty_id'])){
				$msg_mail[REALTY] = $a['realty_id'];	
			}
			if (isset($a['period'])){
				$msg_mail[PERIOD] = $a['period'];
			}
			if (isset($msg_mail[TO])) {
				var_dump($msg_mail);
				try {$app->mail->send($mail, $msg_mail);} 
				catch(SMSException $e) {
					$app->log($e->getMessage());
				}
			}
		}
		if($a['typ'] === 'phone') {
			if (isset($a['contact'])){
				try {
					$phone = str_replace([")", "(", "-"], '', $a['contact']);
					$msg = preg_replace(["/PERIOD/","/REALTY_ID/"], [$a['period'], $a['realty_id']], $msg);
					$app->SMS->send($phone, $msg);
				}
				catch(SMSException $e) {
					$app->log($e->getMessage());
				}
			}
		}
	}
}

$controllers->add([
	"inform/application/store" => [
		desc => "Изменяет статус заявки для объекта",
		access => "self",
		model => "realty",
		param => ["armoring_id"=>"id", "event"=>"event"],
		func => function($param, $argv) {
			$armoring = R::load('armoring', $param->armoring_id);
			$armperiod = R::getCell("select array_to_string(array_agg(to_char(fromdate, 'DD-MM-YYYY')||' '|| to_char(todate, 'DD-MM-YYYY')), ' / ') period 
									from armperiod where armoring_id = ? group by armoring_id", [$param->armoring_id]);
			$realty_id = $argv->model->id;
			
			$user = R::load("user", $armoring->user_id);
			$host = $argv->app->ini["server"]["host"];
			$contact = R::getAll("select a.contact contact, t.name typ from account a, \"type\" t where a.user_id = ? and a.type_id=t.id",[$armoring->user_id]);
			if ($param->event == "erase"){
				$armoring->opt = 6; //заявка отклонена
				$armoring->time = time();
				R::store($armoring);
				$msg = "Ваша заявка на бронь по адресу http://".$host."#list=0=0!tab=0/realty=".$realty_id."=0 на период с".$armperiod." отклонена";
				send($contact, 'eraseapplication',[REALTY => $argv->model->id, PERIOD =>$armperiod, TO =>'', USER_NAME => $user->name], $msg);
				return [];
			}
			if ($param->event == "save") { 
				$armoring->opt = 5; //заявка принята
				$armoring->time = time();
				R::store($armoring);
				$commission = R::load('constants',3);
				$commission = $commission->val;
				$msg = "Ваша заявка на бронь по адресу http://".$host."#list=0=0!tab=0/realty=".$realty_id."=0 подтверждена просим оплатить коммисию $commission% от стоимости брони";
				send($contact, 'saveapplication',[REALTY => $argv->model->id, PERIOD =>$armperiod, COMMISSION => $commission, TO =>'', USER_NAME => $user->name], $msg);
			}
			return [];
		}
	],
	"inform/application/load" => [
		desc => "Загружает список заявок для объекта",
		access => "self",
		model => "realty",
		param => [],
		func => function($param, $argv) {
			$ret = R::getAll("select armoring_id, array_to_string(array_agg(to_char(fromdate,'DD-MM-YYYY')||'-'||to_char(todate,'DD-MM-YYYY')),'/') period, sum(cena) cena
							from (select t.armoring_id, t.fromdate, t.todate, sum(coalesce(s.cena, r.cena)) as cena
							from (select a.realty_id, p.fromdate, p.todate, p.armoring_id, generate_series(p.fromdate, p.todate, '1 day') as day
								from armperiod p, armoring a
								where a.id = p.armoring_id and a.opt = ? and a.realty_id = ?
								) t 
								left join (
								select a.realty_id, a.cena, p.fromdate, p.todate 
								from armperiod p, armoring a 
								where a.opt = 3 and p.armoring_id=a.id) s 
								on t.realty_id=s.realty_id and t.day>=s.fromdate and t.day<=s.todate, 
								realty r where t.realty_id=r.id 
								group by t.armoring_id, t.fromdate, t.todate
							) x group by armoring_id", [4, $argv->model->id]);
			return arrayToRows($ret);	
		}
	],
	"inform/list/load" => [
		desc => "Загружает список заявок для пользователя",
		access => "authall",
		param => [offset => "offset", limit => "limit", currency=>"uint"],
		func => function($param, $argv) {
			
		
		
		
		
		
			if(!$id = $argv->session->user->id) $argv->app->controllers->logout();
			if($param->currency==1) 
				$cur = 1;
			else 
				$cur = R::getCell("select value from exchange where currency_id=? order by id desc limit 1", [$param->currency]);
			$lang = get_lang_id($argv);
			$list = R::getCol("select max(id) from exchange group by currency_id");
			$sql = "select a.id as armoring_id, a.opt opt, r.id as id, r.user_id,  array_to_string(array(
									select (to_char(ap.fromdate, 'DD-MM-YYYY')||' - '||to_char(ap.todate, 'DD-MM-YYYY')) armdata 
									from armperiod ap 
									where ap.armoring_id = a.id),'/') period, address, number_room, number_bed, equipment,
						(select name from placen where placen.place_id=r.place_id order by language_id<>$lang limit 1) as city,
						(select iname from name, namen where r.name_id=name.id and namen.name_id=name.id order by language_id<>$lang limit 1) as metro,
						(select img_id from img_realty where realty_id=r.id order by id limit 1) as img_id, r.name currency,
						round(r.cena*(case when r.currency_id=1 then 1 else r.value end)/1) cena
					from armoring a, (
						select realty.*, m.name_id, c_e.value 
						from realty 
							left join (select value, currency_id c_id from  exchange e where e.".get_ids_list($list).") c_e on c_e.c_id=realty.currency_id 
							left join metro m on realty.metro_id=m.id left join currency c on c.id = 1) r
					where (a.opt >= ? or a.opt=0) and ((a.realty_id = r.id and a.user_id = ?) or (a.realty_id = r.id and r.user_id = ?))
					order by a.time
					offset ? limit ?";
			$ret = R::getAll($sql,[4, $id, $id, $param->offset, $param->limit]);
			 
			return arrayToRows($ret);	
		}
	],
]);
