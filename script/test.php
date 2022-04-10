<?php
/**
	Запускает тесты в нужной последовательности.
*/

//require_once 'PHPUnit/Framework.php';
require_once 'lib/App.php';

require_once "PHPUnit/Autoload.php";

$suite = new PHPUnit_Framework_TestSuite('Все тесты');

require_once("test/ModelTest.php");
$suite->addTestSuite("ModelTest");

foreach(scandir("test") as $file) if($file != "ModelTest.php") if(is_file($path = "test/$file")) {
	require_once($path);
	$name = substr($file, 0, strlen($file)-4);
	$suite->addTestSuite($name);
}

$plugins = (new App)->plugins;

foreach($plugins->getNames() as $name) {
	require_once "plugin/$name/{$name}Test.php";
	$suite->addTestSuite("{$name}Test");
}

$av = [colors=>true];
if(($len = count($argv))>1) {
	$filter = [];
	for($i=1; $i<$len; $i++) $filter[] = ucfirst($argv[$i])."Test";
	$av["filter"] = join("|", $filter);
}

$ret = PHPUnit_TextUI_TestRunner::run($suite, $av);
exit($ret->errorCount()+$ret->failureCount());