<?php

require_once 'PHPUnit/Autoload.php';
require_once 'lib/App.php';
require 'lib/Color.php';

class UnitCase extends PHPUnit_Framework_TestCase {
	
	protected static $bean = [];
	protected static $app;
	//protected static $count = 0;
 
    public static function setUpBeforeClass()
    {
		//self::setupPoject();
		//echo "class=".(++self::$count)."\n";
    }
 
    public static function tearDownAfterClass()
    {
    }
	
	function setUp() {
		//echo get_class($this)."\n";
		$this->timer = microtime(true);
	}
	
	function tearDown() {
		global $COLOR;
		$sub = microtime(true) - $this->timer;
		//print_r($this, true);
		echo "\n{$COLOR[CIAN]}".get_class($this)." {$COLOR[YELLOW]}$sub{$COLOR[RESET]}";
	}
	
	function setupPoject() {
		$app = new App;
		$app->init();
		self::$app = $app;
		return $app;
	}
}

UnitCase::setupPoject();