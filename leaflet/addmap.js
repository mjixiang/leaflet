define(function (require, exports, module) {
    require('/theme/common/leaflet/leaflet-src.js');
/*=========== addMap ===========*/
	(function (){
		function addMap(Coordinate, zoom){   //创建地图  和中心点   120.601656,33.211129 121.062582
			map = L.map('map',{zoomControl:false}).setView([Coordinate.lat, Coordinate.lng], zoom);  /*维度 经度*/
			L.tileLayer('http://agri-map.xaircraft.com/google/{z}/{x}/{y}.jpeg', {
				maxZoom: 18,
				subdomains: '0123',
				zoomControl:false,
				gal:function (o) {
					var secureWord = 'Galileo';
					var sec = '';
					var seclen = ((o.x * 3) + o.y) % 8;
					sec = secureWord.substr(0, seclen);
					setTimeout(function(){
						var leafletControlAttribution = document.getElementsByClassName('leaflet-control-attribution')[0];			
							leafletControlAttribution.innerHTML = 'XAircraft';
						},500);
					return sec;
				}
			}).addTo(map);
		}
		window.addMap = addMap;
	})();
});