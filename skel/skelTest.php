<?php
require_once 'lib/UnitCase.php';

class SkelTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		/*
		$skel = R::dispense("skel");
		$skel->name = "Тестовый Skel";
		R::store($skel);
		*/
		R::freeze( true );
	}

    public function testSkel() {
		$app = self::$app;
        $app->plugins->loadOne("skel");
		$this->assertTrue(true);
    }
}
