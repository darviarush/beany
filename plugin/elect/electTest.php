<?php
require_once 'lib/UnitCase.php';

class ElectTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		
		/*$realty = R::dispense("realty");
		$realty->sharedImg[] = R::dispense("user");
		R::store($realty);*/
		
		$realty = R::dispense("realty");
		$realty->user = R::dispense("user");
		R::store($realty);
		
		$elect = R::dispense("elect");
		$elect->user = R::dispense("user");
		$elect->realty = $realty;
		R::store($elect);
		R::freeze( true );
	}

    public function testElect() {
		$app = self::$app;
        $app->plugins->loadOne("elect");
		
		$controllers = $app->controllers;
		
		$user1 = R::dispense("user"); R::store($user1);
		$user2 = R::dispense("user"); R::store($user2);
		
		$session1 = Model_Session::new_session($user1);
		$session2 = Model_Session::new_session($user2);
		
		# создаём объект недвижимости
		$realty1 = R::dispense("realty");
		$realty1->user = $user1;
		R::store($realty1);
		
		$realty2 = R::dispense("realty");
		$realty2->user = $user1;
		R::store($realty2);
		
		//проверяем добавленную пользователем квартиру в избранное
		$argv = (object) [url=>"/api/elect/save", param =>[id=>$realty1->id], cookie => [sess=>$session2->hash]];
		$res = $controllers->controllerRun($argv);
		$res = R::getAll("select * from elect where realty_id=? and user_id=?", [$realty1->id, $user2->id]);
		$this->assertEquals($res[0]["realty_id"], $realty1->id);
		
		//проверяем список
		$argv = (object) [url=>"/api/elect/list/load", param =>[offset=>0, limit=>10, currency=>1], cookie => [sess=>$session2->hash]];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res[0][0], "id");
		$this->assertEquals($res[0][1], "address");
		$this->assertEquals($res[1][0], $realty1->id);
		$this->assertFalse((bool)$res[1][1]);
		
		//сохраняем вторую квартиру в избранное
		$argv = (object) [url=>"/api/elect/save", param =>[id=>$realty2->id], cookie => [sess=>$session2->hash]];
		$res = $controllers->controllerRun($argv);
		
		$argv = (object) [url=>"/api/elect/list/load", param =>[offset=>0, limit=>1, currency=>1], cookie => [sess=>$session2->hash]];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals(count($res), 3);
		
		//проверяем удаление
		$argv = (object) [url=>"/api/elect/erase", param =>[id=>$realty1->id], cookie => [sess=>$session2->hash]];
		$res = $controllers->controllerRun($argv);
		$res = R::getAll("select * from elect where realty_id=? and user_id=?", [$realty1->id, $user2->id]);
		$this->assertEquals(count($res), 0);

		$argv = (object) [url=>"/api/elect/list/load", param =>[offset=>1, limit=>2, currency=>1], cookie => [sess=>$session2->hash]];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals(count($res), 2);
    }
}
