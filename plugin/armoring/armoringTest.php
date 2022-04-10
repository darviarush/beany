<?php
require_once 'lib/UnitCase.php';

class ArmoringTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		/*
		$armoring = R::dispense("armoring");
		$armoring->name = "Тестовый Armoring";
		R::store($armoring);
		*/
		R::freeze( true );
	}

    public function testArmoring() {
		$app = self::$app;
		$app->plugins->loadOne("armoring");
		//$app->plugins->loadOne("inform");
		$controllers = $app->controllers;
			
		//$this->assertEquals($res["id"], $realty->id);
		//$res = R::find("armperiod", "armoring_id", $res[""])
		
		/*$this->assertEquals(isset($res["armoring"]), true);
		
		$this->assertTrue(true);*/
    }
}
