<?php
require_once 'lib/UnitCase.php';
require_once 'lib/rp.php';


class RpTest extends UnitCase {
	
	function testRp() {
		$tab = CachePDO::get_tables("1(2(3)4)5(6)7");
		$this->assertEquals($tab, []);
		
		$tab = CachePDO::get_tables("select armoring_id, array_to_string(array_agg(to_char(fromdate,'DD-MM-YYYY')||'-'||to_char(todate,'DD-MM-YYYY')),'/') period, sum(cena) cena
							from (select t.armoring_id, t.fromdate, t.todate, sum(coalesce(s.cena, r.cena)) as cena
							from (select a.realty_id, p.fromdate, p.todate, p.armoring_id, generate_series(p.fromdate, p.todate, '1 day') as day
								from armperiod p, armoring a
								where a.id = p.armoring_id and a.opt = ? and a.realty_id = ?
								) t 
								left join (
								select a.realty_id, a.cena, p.fromdate, p.todate 
								from armperiod p, armoring a 
								where a.opt = 3 and p.armoring_id=a.id) s 
								on t.realty_id=s.realty_id and t.day>=s.fromdate and t.day<=s.todate, 
								realty r where t.realty_id=r.id 
								group by t.armoring_id, t.fromdate, t.todate
							) x group by armoring_id");
		
		
		$this->assertEquals($tab, ["armoring", "armperiod", "realty"]);
		
	}

}