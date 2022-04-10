-- загружаем
create table location(
locId int primary key,
country char(2) not null,
region char(2) not null,
city text not null,
postalCode text,
latitude decimal not null,
longitude decimal not null,
metroCode text,
areaCode  text,
place_id int
)


copy location (locId,country,region,city,postalCode,latitude,longitude,metroCode,areaCode) from 'd:\__\GeoLiteCity_20130101\GeoLiteCity-Location.csv' with csv header quote '"' encoding 'Latin-1'


create table blocks(
startIpNum bigint not null,
endIpNum bigint not null,
locId int not null references location(locid)
)

copy blocks (startIpNum,endIpNum,locId) from 'd:\__\GeoLiteCity_20130101\GeoLiteCity-Blocks.csv' with csv header quote '"' encoding 'Latin-1'

create table regions(
country char(2) not null,
region char(2) not null,
name text not null,
unique(country, region)
)

copy regions (country,region,name) from 'd:\__\GeoLiteCity_20130101\region.csv' with csv header quote '"' encoding 'Latin-1'

-- города с одинаковыми названиями в одних и тех же регионах
select count(*), country, region, city from location group by country, region, city having count(*)>1

-- страны, которых нет в maxmind
select *
from country left join location on region = '' and city = '' and country.alpha2 = country 
where region is null

-- страны, которых нет у нас
select *
from location left join country on country.alpha2 = country
where region = '' and city = '' and country.alpha2 is null

-- регионы переименовываем с буквенно-цифровых обозначений на именованные - не надо
-- update location set region=(select name from regions where regions.region=location.region and regions.country=location.country )

-- проставляем соответствия location --> place

alter table location add column place_id int
create index location_lat_lng_idx on location(latitude, longitude)

update location set place_id=(select id from country where country=alpha2 limit 1) where region='' and city='' -- для стран

update location set place_id=(select place_id from place where location.latitude = place.latitude and location.longitude = place.longitude) -- для городов

create index location_place_id_idx on location(place_id)

-- переливаем blocks для найденных
insert into ipmap(place_id, "start", "end") select place_id, case when startipnum< then startipnum else -startipnum end, endipnum from blocks inner join location on blocks.locid=location.locid where place_id is not null group by place_id, startipnum, endipnum

-- устанавливаем широту и долготу
update place set longitude = (select longitude from location where place_id=place.id limit 1), latitude = (select latitude from location where place_id=place.id limit 1) where exists(select 1 from location where place_id=place.id limit 1)