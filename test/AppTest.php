<?php
require_once 'lib/UnitCase.php';
require_once 'lib/App.php';

class AppTest extends UnitCase {
	
	function testCashe() {
		$app = new App;
		$app->init();
		$redis = $app->pdo->redis;
		$find = R::find("session", "time > ?", [time()]);
		$this->assertFalse((bool) $find);
		
		$beans = R::dispense("role", "true limit 1");
		
	}
}