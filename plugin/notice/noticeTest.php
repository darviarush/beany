<?php
require_once 'lib/UnitCase.php';

class NoticeTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		/*
		$notice = R::dispense("notice");
		$notice->name = "Тестовый Notice";
		R::store($notice);
		*/
		R::freeze( true );
	}

    public function testNotice() {
		$app = self::$app;
        $app->plugins->loadOne("notice");
		$this->assertTrue(true);
    }
}
