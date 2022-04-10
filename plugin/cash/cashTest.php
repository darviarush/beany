<?php
require_once 'lib/UnitCase.php';

class CashTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		
		$user = R::dispense("user");
		R::store($user);
		
		$payment = R::dispense("payment");	# вид платежа
		$payment->name = "x";				# название
		$payment->desc = "x";				# пояснение
		$payment->sign = -1;				# направление платежа - +1 / -1
		
		$cash = R::dispense("cash");		# платёж
		$cash->sum = 1.1;					# сумма
		$cash->time = "2000-01-01 10:10:10";# время совершения платежа
		$cash->payment = $payment;			# вид платежа
		$cash->realty = R::dispense("realty");	# объект недвижимости
		$cash->user = R::dispense("user");	# плательщик
		$cash->cashier = $user;	# кассир
		R::store($cash);
		
		$cash = R::load("cash", $cash->id);
		$this->assertTrue((bool) $cash->cashier_id);
		
		
		R::freeze( true );
	}

    public function testCash() {
		$app = self::$app;
        $app->plugins->loadOne("cash");
		$this->assertTrue(true);
    }
}
