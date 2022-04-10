<?php

/**
ExternalPayments - это плагин для статуса платежа
 */

$controllers->add([
	"externalPayments/setStatus" => [
		desc => "Внешняя система обращаясь к этому скрипту будет менять статус платежа",
		access => "all",
		param => [eshopId => "string", paymentId => "string", orderId => "string", eshopAccount => "string",
                  serviceName => "string", recipientAmount => "string", recipientCurrency => "string",
                  paymentStatus => "string", userName => "string", userEmail => "string",
                  paymentData => "string", hash => "string"],
		func => function($param, $argv)
        {
    	    $ini = $argv->app->ini['externalPayments'];
            if($argv->HEAD['X-Real-IP']!=$ini['externalIP'])
            {
        	    $argv->app->log('Неверный ip отправителя ip needed:'.$ini['externalIP'].' ip retrieved:'.$argv->HEAD['X-Real-IP']);
                return [error => 'Параметры переданные из Платежной системы неверны'];
                //return [error=>$error];
            }
		
            if($param->eshopId!=$ini['eshopId'])
            {
                $argv->app->log("Неверный иденттификатор магазина");
                return [error=>'Параметры переданные из Платежной системы неверны'];
            }

            $outhash = $param->hash;
            $myhash = md5($param->eshopId."::".$param->orderId."::".$param->serviceName."::".$param->eshopAccount."::".$param->recipientAmount."::".$param->recipientCurrency."::".$param->paymentStatus."::".$param->userName."::"
            .$param->userEmail."::".$param->paymentData."::".$ini['secretKey']);
            if($outhash!=$myhash)
            {
                 $argv->app->log("Платеж №".$param->orderId." ошибка приема платежа: неверных хэш платежа need".$param->hash." resieved:".$myhash);
                 return [error=>'Платеж №'.$param->orderId.' ошибка приема платежа: неверный хэш платежа'];
            }

            $payment = R::load('external_payments',$param->orderId);

            if($param->eshopAccount!=$ini['eshopAccount'])
            {
                $argv->app->log("Платеж №".$param->orderId." ошибка приема платежа: неверные полученные данные:".$param->eshopAccount." внутренние данные:".$ini['eshopAccount']);
                return [error=>'Платеж №'.$param->orderId.' ошибка приема платежа: неверные полученные данные.'];
            }
            if($param->recipientAmount!=$payment->paymentAmount)
            {
                $argv->app->log("Платеж №".$param->orderId." ошибка приема платежа: неверные полученные данные:".$param->recipientAmount." внутренние данные:".$payment->paymentAmount);
                return [error=>'Платеж №'.$param->orderId.' ошибка приема платежа: неверные полученные данные.'];
            }

            /*if($param->recipientCurrency!=$payment->currency)
            {
                $argv->app->log("Платеж №".$param->orderId." ошибка приема платежа: неверные полученные данные:".$param->recipientCurrency." внутренние данные:".$payment->currency);
                return [error=>'Платеж №'.$param->orderId.' ошибка приема платежа: неверные полученные данные:'.$param->recipientCurrency." внутренние данные:".$payment->currency];
            }*/

            if(cp1251_to_utf8($param->userName)!=$payment->payerName)
            {
                $argv->app->log("Платеж №".$param->orderId." ошибка приема платежа: неверные полученные данные:".$param->userName." внутренние данные:".$payment->payerName);
                return [error=>'Платеж №'.$param->orderId.' ошибка приема платежа: неверные полученные данные.'];
            }

            if(strtolower($param->userEmail)!=strtolower($payment->payerEmail))
            {
                $argv->app->log("Платеж №".$param->orderId." ошибка приема платежа: неверные полученные данные:".$param->userEmail." внутренние данные:".$payment->payerEmail);
                return [error=>'Платеж №'.$param->orderId.' ошибка приема платежа: неверные полученные данные.'];
            }

            if(cp1251_to_utf8($param->serviceName)!=$payment->serviceName)
            {
                $argv->app->log("Платеж №".$param->orderId." ошибка приема платежа: неверные полученные данные:".cp1251_to_utf8($param->serviceName)." внутренние данные:".$payment->serviceName);
                return [error=>'Платеж №'.$param->orderId.' ошибка приема платежа: неверные полученные данные.'];
            }

            $payment->paymentID = $param->paymentId;
            $payment->paymentStatus = $param->paymentStatus;
            $payment->paymentData = $param->paymentData;
            R::store($payment);
            if($payment->paymentStatus=='5'){
                $user = R::load("user",$payment->paytoUser_id);
				$contact = R::load("select a.contact, t.name typ from account, \"type\" t where a.user_id=? and t.id=a.type_id  ",$payment->paytoUser_id);
                switch($payment->paymentParam)
                {
                    case "armoring":
                                    $armoring = R::load("armoring",$payment->paymetObject);
                                    $periods = '';
                                    foreach($armoring->ownArmperiod as $k=>$v)
                                    {
										$periods = $v->fromdate."-".$v->todate." ";
                                    }
                                    $realty = R::load("realty", $armoring->realty_id);
									
									foreach ($contact as $a){
										if ($a['typ'] == 'phone'){
											try {
												$argv->app->SMS->send($a['contact'], "Принята оплата за бронь №".$param->orderId." за период ".$periods." по адресу:".$realty->address);
											} catch(SMSException $e) {
												$argv->app->log($e->getMessage());
											}
										}
										if ($a['typ'] =='email'){
											try {
												$argv->app->mail->send("commitpayment", [ARMOR=>$param->orderId, TO=>$a['contact'], MSG=>'Оплата брони']);
											} catch(SMSException $e) {
												$argv->app->log($e->getMessage());
											}
										}
									}
                                    break;
                    default:
                		    return 'error';
                                    break;
                }


            }
            return 'OK';
		}
	],
	"externalPayments/status/store" => [
		desc => "Изменяет статус платежа",
		access => "all",
		param => [ orderId => "string"],
		func => function($param, $argv)
        {
            $payment = R::load('external_payments',$param->orderId);
            $payment->paymentID = "255";//генерировать новый
            $payment->paymentStatus = "5";
            $payment->paymentData = date("Y-m-d h:i:s");//$param->paymentData;
            R::store($payment);
            if($payment->paymentStatus == '5' && $payment->paymentParam == "armoring"){
				$contacts = R::getAll("select u.id, u.name, a.contact, t.name typ 
								from \"user\" u, account a, \"type\" t 
								where (u.id=? or u.id=?) and u.id=a.user_id and t.id=a.type_id", [$payment->payerUser_id, $payment->paytoUser_id]);
								
				$armoring = R::load("armoring", $payment->paymetObject);
				$armoring->opt = 0;
				R::store($armoring);
				$periods = '';
				foreach($armoring->ownArmperiod as $k=>$v) {
					$periods = $v->fromdate."-".$v->todate." ";
				}
				$realty = R::load("realty", $armoring->realty_id);		
				
				foreach ($contacts as $value){
					if ($value['id']==$payment->payerUser_id){
						$contactUser .= $value['typ'].": ".$value['contact']." ";
					} else {
						$contactToUser .= $value['typ'].": ".$value['contact']." ";
					}
				}
				
				foreach ($contacts as $a) {
					if ($a['id'] == $payment->payerUser_id) {
						$msg = "Принята коммисия за услуги сайта за бронь по адресу: ".$realty->address ." на период ".$periods." Контакты арендодателя: ".$contactToUser;
						$email = 'paymentUser';
						$contact = $contactToUser;
					} else {	
						$msg = "Контакты арендатора ".$contactUser." на аренду объекта по адресу ".$realty->address ." на период ".$periods;
						$email = 'paymentToUser';
						$contact = $contactUser;
					}
					
					if ($a['typ'] == 'phone'){
						try {
							$argv->app->SMS->send($a['contact'], $msg);
						} catch(SMSException $e) {
							$argv->app->log($e->getMessage());
						}
					}
					if ($a['typ'] =='email'){
						try {
							$argv->app->mail->send($email, [ADDRESS=>$realty->address, TO=>$a['contact'], PERIOD=>$periods, CONTACT=>$contact]);
						} catch(SMSException $e) {
							$argv->app->log($e->getMessage());
						}
					}
				}
				return [1];
			} else {
                return ['error'];
			}
		}
	],
    "externalPayments/createArmoringPayment" => [
		desc => "создаем форму оплаты услуги",
		access => "authall",
		param => [id => "id"],
		func => function($param, $argv)
        {
			$ret = R::getRow("select armoring_id, sum(cena) cena
							from (select t.armoring_id, t.fromdate, t.todate, sum(coalesce(s.cena, r.cena)) as cena
							from (select a.realty_id, p.fromdate, p.todate, p.armoring_id, generate_series(p.fromdate, p.todate, '1 day') as day
								from armperiod p, armoring a
								where a.id = p.armoring_id and a.opt = ? and a.id = ?
								) t 
								left join (
								select a.realty_id, a.cena, p.fromdate, p.todate 
								from armperiod p, armoring a 
								where a.opt = 3 and p.armoring_id=a.id) s 
								on t.realty_id=s.realty_id and t.day>=s.fromdate and t.day<=s.todate, 
								realty r where t.realty_id=r.id 
								group by t.armoring_id, t.fromdate, t.todate
							) x group by armoring_id", [5, $param->id]);
			$armoring = R::load("armoring", $param->id);
			$user = $armoring->user;
			$ini = $this->app->ini["externalPayments"];
			$externalPayment = R::dispense("external_payments");
			$externalPayment->name = "Оплата №".$armoring->id."тест";
			$externalPayment->serviceName = "Оплата коммисии сайта $armoring->id";
			$externalPayment->paymentAmount = $ret["cena"];
			$currency = "TST";
			$externalPayment->payerName = $user->name;
			$externalPayment->payerEmail = R::getCol('select contact from account, "type" t where user_id = ? and t.name =? order by account.id limit 1', [$user->id,"email"])[0];
			$externalPayment->paymentParam = 'armoring';

			$externalPayment->payerUser = $armoring->user;
			$externalPayment->paytoUser = $armoring->realty->user;
			$externalPayment->paymetObject = $armoring->id;
			$externalPayment->sharedArmoring[] = $armoring;
			R::store($externalPayment);
			$ex = $externalPayment->export();
			$hash = md5($ini['eshopId'].'::'.$externalPayment->id.'::'.$externalPayment->serviceName.'::'.$externalPayment->paymentAmount.'::'.$currency.'::'.$ini['secretKey']);
			$argv->app->log($hash);
		return [pay=>$ex, eshopId=>$ini['eshopId'], currency=>$currency, hash=>$hash];
		}
	],
]);
