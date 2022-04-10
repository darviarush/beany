<?php
require_once 'PHPUnit/Autoload.php';
require_once 'Fib.php'; // � ���� ������ ��������� ������� fib

class FibTest extends PHPUnit_Framework_TestCase { // �������� ����� ����� ��� �� ��� ������ ��� �����, ������� ����� �����������, ������ � Test �� �����
    public function testFib() {	// �������� ����� ����� ��� �� ��� �������, ������� ���������, ������ � test �������
		// ������������ ��������:
		$this->assertEquals(fib(1), 1);
        $this->assertEquals(fib(2), 1);
		// ������� ������:
		$this->assertEquals(fib(7), 13);
		// ��������� ������� �� ���������� �����:
		$this->assertEquals(fib(0), 0);
		$this->assertEquals(fib(-10), 0);
    }
}