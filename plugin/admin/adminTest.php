<?php
require_once 'lib/UnitCase.php';

class AdminTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		/*
		$admin = R::dispense("admin");
		$admin->name = "Тестовый Admin";
		R::store($admin);
		*/
		R::freeze( true );
	}

    public function testAdmin() {
		$app = self::$app;
        $app->plugins->loadOne("admin");
		$this->assertTrue(true);
    }
}
