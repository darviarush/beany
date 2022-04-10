<?php
require_once 'lib/UnitCase.php';

class ExternalPaymentsTest extends UnitCase {

	public function testModel() {
		R::freeze( false );

		$externalPayments = R::dispense("external_payments");
		$externalPayments->name = "Тестовый ExternalPayments";
        $externalPayments->orderID = "1555";
        $externalPayments->paymentID = "255";
        $externalPayments->serviceName = "Оплата брони тест";
        $externalPayments->paymentAmount = 152.5;
        $externalPayments->recivedAmount = 150.5;
        $externalPayments->currency =R::dispense("currency");
        $externalPayments->paymentStatus = "5";
        $externalPayments->payerName = "Сергей";
        $externalPayments->payerEmail = "serg@mail.ru";
        $externalPayments->payerUser = R::dispense("user");
        $externalPayments->paymentCreateData ="2000-01-01 10:10:10";
        $externalPayments->paymentData ="2000-01-01 10:10:10";
        $externalPayments->paymetObject ="armoring";
        $externalPayments->paymentParam ="none";
        $externalPayments->sharedArmoring[] = R::dispense("armoring");
        $externalPayments->paytoUser = R::dispense("user");

		R::store($externalPayments);
		R::freeze( true );
	}

    public function testExternalPayments() {
		$app = self::$app;
        $app->plugins->loadOne("externalPayments");
		$this->assertTrue(true);
    }
}
