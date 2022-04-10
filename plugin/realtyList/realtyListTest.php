<?php
require_once 'lib/UnitCase.php';
require_once 'lib/App.php';

class RealtyListTest extends UnitCase {

    public function testModel() {	# недвижимость
		R::freeze( false );
		
		//создаем таблицу валют 
		$currency = R::dispense("currency");
		$currency->name = "x";
		$currency->symbol = "x";
		$currency->left = 1;
		R::store($currency);

		// создаем таблицу курса валют
		$exchange = R::dispense("exchange");
		$exchange->currency = $currency;
		$exchange->value = 1.1;
		$exchange->date = '1976-01-01';
		R::store($exchange);
		
		// создаем таблицу районов
		$district = R::dispense("district");
		$district->place = R::dispense("place");
		$district->name = R::dispense("name");
		R::store($district);
		
		// создаем таблицу метро
		$metro = R::dispense("metro");
		$metro->place = R::dispense("place");
		$metro->name = R::dispense("name");
		R::store($metro);
		
		// квартира/коттедж/комната
		$form = R::dispense("form");
		$form->name = "Тест Квартира";
		R::store($form);
		
		$user = R::dispense("user");
		
        $realty = R::dispense("realty");
		$realty->name = "Тестовый RealtyList";
		$realty->currency = $currency;
		$realty->cena = 1.8;
		$realty->cena_month = 1.8;
		$realty->address = "x";
		$realty->place = R::dispense("place");
		$realty->district = $district;
		$realty->metro = $metro;
		$realty->floor = 1;
		$realty->number_room = 1;
		$realty->number_bed = 1;
		$realty->count_floor = 1;
		$realty->equipment = 1;
		$realty->latitude = 1.8;
		$realty->longitude = 1.8;
		$realty->comment = "x";
		$realty->top = 1;
		$realty->time_change = time();
		$realty->user = $user;
		$realty->form = $form;								# признак: 1 - комната, 2 - квартира, 3 - коттедж (дом)
		$realty->square_realty = 1;
		$realty->square_kitchen = 1;
		$realty->state_realty = "x";
		$realty->sharedImg[] = $img = R::dispense("img");	# фото		
		R::store($realty);
		$this->assertTrue((bool) $img->id);
		$this->assertTrue((bool) $currency->id);
		$this->assertTrue((bool) $metro->id);
		//$this->assertTrue((bool) $district->id);
		$this->assertTrue((bool) $realty->user->id);
		
		
		$this->assertEquals(count($realty->sharedImg), 1);
		
		$this->assertTrue((bool) $img->id);
		$this->assertEquals(count($img->sharedRealty), 1);
		
		$img = R::dispense("img");
		$img->sharedRealty[] = $realty;
		R::store($img);
		
		$this->assertEquals(count($realty->sharedImg), 2);
		
		# периоды подключаются к заявкам
		$armperiod = R::dispense("armperiod");
		$armperiod->fromdate = '1976-01-01';
		$armperiod->todate = '1976-01-03';
		$armperiod->begin = '16:27:00';
		$armperiod->end = '17:30:00';
		
		# заявки на бронь
		$armoring = R::dispense("armoring");
		$armoring->user = $realty->user;		# пользователь оставивший заявку
		$armoring->realty = $realty;			# квартира
		$armoring->desc = "desc";				# комментарий арендатора к заявке
		$armoring->ownArmperiod[] = $armperiod;	# заявка на период
		$armoring->time = time();# время и дата бронирования 
		$armoring->opt = 1;						# 0 - забронировано, 1 - оплачено, 2 - блокировано, 3 - цена
		$armoring->cena = 1.1;					# цена на период

		R::dependencies(["armperiod"=>["armoring"]]);	# ставим удалять armperiod при удалении armoring
		R::store($armoring);
		
		$armoring1 = R::dispense("armoring");
		$v = $armoring->export();
		unset($v["id"]);
		$armoring1->import($v);
		R::store($armoring1);
		
		$this->assertEquals(count($armoring1->ownArmperiod), 0);
		
		$armperiod = R::dispense("armperiod");
		$armperiod->armoring = $armoring1;
		R::store($armperiod);
		
		R::trash($armperiod);
		$armoring1 = R::load("armoring", $armoring1->id);
		$this->assertTrue((bool) $armoring1->id);
		
		$armperiod = R::dispense("armperiod");
		$armperiod->armoring = $armoring1;
		R::store($armperiod);
		
		R::trash($armoring1);
		$armperiod = R::load("armperiod", $armperiod->id);
		
		$this->assertFalse((bool) $armperiod->id);
		
		$armoring = R::load("armoring", $armoring->id);
		$this->assertTrue((bool) $armoring->user->id);

		$realty = R::load("realty", $realty->id);
		$this->assertTrue((bool) $realty->user->id);
		
		# услуги
		$service = R::dispense("service");
		$service->name = "x";
		R::store($service);		
		
	
		
		# адреса для уведомления обслуживающего персонала
		$notice = R::dispense("notice");
		$notice->comment = "x";
		$notice->msg = "x";
		$notice->who = 1;
		$notice->phone = "x";
		$notice->email = "x";
		$notice->service = "x";
		$notice->where = 1;
		$notice->cena = 1.1;
		$notice->realty = $realty;
		$notice->day = 1;
		$notice->phone = "x";
		$notice->email = "x";
		$notice->hour = 1;
		$notice->minute = 1;
		$notice->interval = 1;
		R::store($notice);
		
		# услуги выбранные
		$selservice = R::dispense("selservice");
		//$selservice->realty = $realty;
		$selservice->armoring = $armoring;
		$selservice->user = $user;//ссылается на таблицу пользователей
		$selservice->fromdate = '1976-01-01';
		$selservice->todate = '1976-01-01';
		$selservice->hour = 1;
		$selservice->minute = 1;
		$selservice->period = 1;
		$selservice->day = 1;
		$selservice->count_service = 1;
		$selservice->date_service = "1976-01-01";
		$selservice->notice = $notice;
		$selservice->status = 1;
		R::store($selservice);
		
		R::freeze( true );
    }
	
	public function testRealty() {
		$app = (new App)->init();
		$app->plugins->loadOne("realtyList");
		
		$controllers = $app->controllers;

		# получаем много
		$argv = (object) [url=>"/api/realtyList/list/load", param=>[offset=>0, limit=>100, order=>"", my=>0, district=>"[]", metro=>"[]", number_room=>"[]", place=>0, counter_room=>1000, currency=>1, equipment=>0]];
		$res = $controllers->controllerRun($argv);
		
		if(count($res)>0) {
			//$this->assertEquals(count($res), 101);
			$this->assertEquals($res[arr][0][0], "id");
		}
				
		# создаём пользователей
		$user1 = R::dispense("user"); R::store($user1);
		$user2 = R::dispense("user"); R::store($user2);
		# логинимся
		$session1 = Model_Session::new_session($user1);
		$session2 = Model_Session::new_session($user2);
		# создаём объект недвижимости
		$realty = R::dispense("realty");
		$realty->user = $user1;
		R::store($realty);
		
		$place = R::dispense("place");
		R::store($place);
		$place1 = R::load("place", $place->id);
		$place1->city_id = $place->id;
		R::store($place1);
		
		//тестируем похожие варианты квартир
		$realty = R::dispense("realty");
		$realty->user = $user1;
		$realty->cena = 1;
		$realty->latitude = 10;
		$realty->longitude = 10;
		$realty->place = $place1;
		R::store($realty);
		
		//Добавляем точно такой же вариант
		$realty2 = R::dispense("realty");
		$realty2->user = $user1;
		$realty2->cena = 1;
		$realty2->latitude = 10;
		$realty2->longitude = 10;
		$realty2->place = $place1;
		R::store($realty2);
		
		$armperiod = R::dispense("armperiod");
		$armperiod->fromdate = '1976-01-01';
		$armperiod->todate = '1976-01-03';
		R::store($armperiod);
		
		# заявки на бронь
		$armoring = R::dispense("armoring");
		$armoring->user = $user2;		# пользователь оставивший заявку
		$armoring->realty = $realty2;			# квартира
		$armoring->desc = "desc";				# комментарий арендатора к заявке
		$armoring->ownArmperiod[] = $armperiod;	# заявка на период
		$armoring->opt = 0;						# 0 - забронировано, 1 - оплачено, 2 - блокировано, 3 - цена
		R::store($armoring);
		
		//Добавляем точно такой же вариант
		$realty3 = R::dispense("realty");
		$realty3->user = $user1;
		$realty3->cena = 1;
		$realty3->latitude = 10;
		$realty3->longitude = 10;
		$realty3->place = $place1;
		R::store($realty3);
		
		# получаем один
		$argv = (object) [url=>"/api/realtyList/load", param=>[id=>$realty->id, currency=>1, date_from=>'1976-01-01', date_to=>'1976-01-03']];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res["id"], $realty->id);
		$this->assertEquals(isset($res["armoring"]), true);
		$this->assertEquals(count($res["like"]), 2);
		
		
		$argv = (object) [url=>"/api/realtyList/load", param=>[id=>$realty->id, currency=>1, date_from=>'', date_to=>'']];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res["id"], $realty->id);
		$this->assertEquals(isset($res["armoring"]), true);
		$this->assertEquals($res["like"][0][0], "id");
		$this->assertTrue($res["like"][1][0]==$realty2->id and $res["like"][2][0]==$realty3->id or $res["like"][2][0]==$realty2->id and $res["like"][1][0]==$realty3->id);
		$this->assertEquals($res["like"][0][1],"img_path");
		$this->assertTrue(is_null($res["like"][1][1]));
		$this->assertEquals($res["like"][0][2],"cena");
		
		## проверяем права
		# realty принадлежит 1-му пользователю. С сессией второго
		try {
			$res = $controllers->controllerRun($argv = (object) [
				url=>"/api/realtyList/store", param=>[id=>$realty->id], cookie => [sess=>$session2->hash]
			]);
			$this->fail();
		} catch(AException $e) {
			$this->assertEquals($e->getCode(), 201);
		}
		
		# без сессии
		try {
			$res = $controllers->controllerRun($argv = (object) [
				url=>"/api/realtyList/store", param=>[id=>$realty->id]
			]);
			$this->fail();
		} catch(AException $e) {
			$this->assertEquals($e->getCode(), 200);
		}
		
		# сохранение
		$res = $controllers->controllerRun($argv = (object) [
			url=>"/api/realtyList/store", param=>[id=>$realty->id], cookie => [sess=>$session1->hash]
		]);

	}
}
