<?php
require_once 'lib/UnitCase.php';

class InformTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		/*
		$inform = R::dispense("inform");
		$inform->name = "Тестовый Inform";
		R::store($inform);
		*/
		R::freeze( true );
	}

    public function testInform() {
		$app = self::$app;
		$app->plugins->loadOne("armoring");
		$app->plugins->loadOne("inform");
		$controllers = $app->controllers;
		
		# создаём пользователей
		$user1 = R::dispense("user"); R::store($user1);
		$user2 = R::dispense("user"); R::store($user2);
		# логинимся
		$session1 = Model_Session::new_session($user1);
		$session2 = Model_Session::new_session($user2);
		# создаём объект недвижимости
		$realty = R::dispense("realty");
		$realty->user = $user1;
		$realty->cena = 100;
		$realty->currency = R::load('currency',1);
		R::store($realty);
        
		$start_count = R::getCell('select count(1) from armoring');
		$argv = (object) [url=>"/api/armoring/store", param => ["ownArmperiod"=>"[{\"fromdate\":\"2013-01-01\",\"todate\":\"2013-01-08\"}]", 
							"realty_id" => $realty->id, "phone" => "", "email"=>"test@test.test","fio"=>"fio", "currency_id"=>1], cookie => [sess=>$session2->hash]];
		$res = $controllers->controllerRun($argv);
		$armoring_id = $res["id"];
		$arm = R::getAll('select * from armoring where id=?', [$armoring_id]);
		$this->assertEquals($arm[0]['opt'], 4);
		$end_count = R::getCell('select count(1) from armoring');
		
		$this->assertEquals(1, $end_count-$start_count);
		$this->assertEquals($res["fromdate"],"2013-01-01");
		$this->assertEquals($res["todate"], "2013-01-08");
		
		$argv = (object) [url=>"/api/inform/application/load", param => [id=>$realty->id], cookie => [sess=>$session1->hash]];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res[0][0],"armoring_id");
		$this->assertEquals($res[0][1],"period");
		$this->assertEquals($res[0][2],"cena");
		$this->assertEquals($res[1][0], $armoring_id);
		$this->assertEquals($res[1][1],"01-01-2013-08-01-2013");
		$this->assertEquals($res[1][2],(int)"800");
		
		$argv = (object) [url=>"/api/inform/application/store", param => [id=>$realty->id, "armoring_id"=>$armoring_id, "event"=>"save"], cookie => [sess=>$session1->hash]];
		$res = $controllers->controllerRun($argv);
		$arm = R::getAll('select * from armoring where id=?', [$armoring_id]);
		$this->assertEquals($arm[0]['opt'], 5);
		
		$argv = (object) [url=>"/api/inform/list/load", param => [offset => 0, limit => 9, currency=>1], cookie => [sess=>$session2->hash]];
		$res = $controllers->controllerRun($argv);
		
		$this->assertEquals($res[0][0], "armoring_id");
		$this->assertEquals($res[1][0], $armoring_id);
		$this->assertEquals($res[0][2], "id");
		$this->assertEquals($res[1][2], $realty->id);
    }
}
