<?php

/**
Armoring - это плагин для бронирования объекта недвижимости
*/

$controllers->add([
	/************************************* armoring *************************************/
	
	"armoring/store" => [
		desc => "бронирует объект недвижимости",
		access => "authall",	# все зарегистрированные пользователи
		param => ["ownArmperiod"=>"json", "realty_id" => "id", "phone" => "phone_z", "email"=>"email" ,"fio"=>"fio", "currency_id"=>"id"],
		func => function($param, $argv) {
			foreach($param->ownArmperiod as $period) {	//проверка на бронь
				
				$collission = R::getCell("
					select count(*) from armperiod p, armoring a
 			 		 where p.armoring_id=a.id and a.realty_id = ? and a.opt=0
   		           		   and not ( p.todate <= ? or p.fromdate >= ? )", 
   		           	       [$param->realty_id, $period->fromdate, $period->todate] 
   		           	);
			}
			if (intval($collission)) {
				$realty = $argv->app->controllers->lightRun("realtyList/load", $argv, [id => $param->realty_id, currency => $param->currency_id]);
				throw new AException("На указанный период недвижимость уже забронирована ", 409, [ ret => $realty, fn => "app.plugin.realtyList.refreshArmoring"] );
			}
			//оставляем заявку на бронь
			$armoring = R::dispense("armoring");
			$armoring->user = $user = $argv->session->user;
			$armoring->realty = R::load("realty", $param->realty_id);
			$armoring->opt = 4;
			$armoring->time = time();
			// отправляем SMS арендодателю квартиры и письма
			$user_owner = R::getAll("select a.contact, t.name typ, u.name user_name from realty r, account a, \"type\" t, \"user\" u  where r.id=? and u.id=r.user_id and u.id=a.user_id and a.type_id=t.id",[$param->realty_id]);
			foreach ($user_owner as $contact) {
				$msg = "У вас новая бронь по адресу ".$armoring->realty->address." http://".$argv->app->ini["server"]["host"]."/#list=0=0!tab=0/realty=".$armoring->realty->id."=3 подтвердить бронь вы можете по ссылке, отправить sms на номер или email по адресу";
				if ($contact["typ"] == "phone") {
					$phone = str_replace([")", "(", "-"], '', $contact['contact']);
					try {
						$argv->app->SMS->send($phone, $msg);
					} catch(SMSException $e) {
						$argv->app->log($e->getMessage());
					}
				} 
				if ($contact["typ"] == "email") {
					try {
						$argv->app->mail->send("reservation", [ADDRESS=>$armoring->realty->address, REALTY=>$armoring->realty->id, TO=>$contact['contact'], USER_NAME=>$contact['user_name']]);
					} catch(SMSException $e) {
						$argv->app->log($e->getMessage());
					}
				}
			}
			
			$armoring->desc = $param->desc;
			//сохраняем данные пользователя бронирующего квартиру
			if(!$user->name) $user->name = $param->fio;
			foreach (["phone" => $param->phone, "email" => $param->email] as $key => $value){
				$account = R::getCell("select count(1) from account a, type t where a.contact = ? and t.id=a.type_id and t.name=?",[$value, $key]);
				if(!$account && $value) {
					$account = R::dispense("account");
					$account->type = R::findOne("type","name=?",[$key]);
					$account->contact = $value;
					R::store($account);
				}
			}
			//Проверить указаны уже периоды или нет
			 R::load("armperiod", $param->realty_id);
			foreach($param->ownArmperiod as $period) {
				$armperiod = R::dispense("armperiod");
				$armperiod->import($period);
				$armoring->ownArmperiod[] = $armperiod;
			}
			R::store($armoring);
			$notice = R::getCol("select s.id id 
						from selservice s, notice n 
						where s.user_id = ? and s.armoring_id is null and s.notice_id=n.id and n.realty_id = ?", [$argv->session->user->id, $param->realty_id]);
			foreach($notice as $k => $id) {
				$selservice = R::load("selservice", $id);
				$selservice->armoring_id = $armoring->id;
				R::store($selservice);
			}
			$ret = R::getRow('select min(p.fromdate) fromdate, max(p.todate) todate, a.id id
								from armoring a, armperiod p 
								where a.id = p.armoring_id and a.id=?
								group by a.id', [$armoring->id]);
								
			return [id=>$armoring->id, fromdate=>$ret["fromdate"], todate=>$ret["todate"] ];
		}
	],
	"armoring/erase" => [
		desc => "отменяет бронь на объект недвижимости",
		access => "self",
		model => "armoring",
		param => ["id" => "id"],
		func => function($param, $argv) {
			$armoring = $argv->model;
			R::trash($armoring);			# удаляются так же и armperiod-ы
			return [];
		}
	],
	"armoring/block" => [
		desc => "блокирует возможность бронирования",
		access => "self",
		model => "realty",
		param => ["ownArmperiod"=>"shared", "id"=>"id"],
		func => function($param, $argv) {
			//
			$armoring = R::dispense("armoring");
			$armoring->user = $argv->session->user;
			$armoring->realty = $argv->model;
			$armoring->opt = 2;
			$armoring->ownArmperiod = $param->ownArmperiod;
			R::store($armoring);
			return [id=>$armoring->id];
		}
	],
	
	"armoring/cena" => [
		desc => "устанавливает ину+ю цену на указанный период",
		access => "self",
		model => "realty",
		param => ["ownArmperiod"=>"shared", "id"=>"id", "cena"=>"umoney"],
		func => function($param, $argv) {
			$armoring = R::dispense("armoring");
			$armoring->user = $argv->session->user;
			$armoring->realty = $argv->model;
			$armoring->opt = 3;
			$armoring->cena = $param->cena;
			$armoring->ownArmperiod = $param->ownArmperiod;
			R::store($armoring);
			return [id => $armoring->id];
		}
	],
	"armoring/cena/set" => [
		desc => "изменяет иную цену",
		access => "self",
		model => "armoring",
		param => ["id"=>"id", "cena"=>"umoney"],
		func => function($param, $argv) {
			$armoring = $argv->model;
			$armoring->cena = $param->cena;
			R::store($armoring);
		}
	],
	/*"armoring/x" => [
		desc => "",
		access => "all", 
		param => [],
		func => function($param, $argv) {
			return [];
		}
	]*/
]);
