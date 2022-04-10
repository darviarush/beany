<?php
require_once 'PHPUnit/Autoload.php';
require_once 'Fib.php'; // в этом модуле находится функция fib

class FibTest extends PHPUnit_Framework_TestCase { // называем класс теста так же как модуль или класс, который будем тестировать, только с Test на конце
    public function testFib() {	// называем метод теста так же как функцию, которую тестируем, только с test вначале
		// терминальные ситуации:
		$this->assertEquals(fib(1), 1);
        $this->assertEquals(fib(2), 1);
		// обычный случай:
		$this->assertEquals(fib(7), 13);
		// параметры выходят за допустимые рамки:
		$this->assertEquals(fib(0), 0);
		$this->assertEquals(fib(-10), 0);
    }
}