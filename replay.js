seajs.use(["/theme/common/common","/theme/common/core","/theme/common/geo.convertor"], function () {
   

   var qs = new QueryString();
    function autoSize(){
        var CHeight = document.documentElement.clientHeight;
        var CWidth = document.documentElement.clientWidth;
    }
    autoSize();
    $(window).on('resize',function(){
        autoSize();
    });
    
    //纠偏
    function BPoint(longitude,latitude){
        var latlng = GEO.GPS2bd({lat:latitude*1, lng:longitude*1});
        var new_point = new BMap.Point(latlng.lng,latlng.lat);
        return  new_point;
    }

    var map = new BMap.Map("map",{ mapType: BMAP_HYBRID_MAP});
    var pot = BPoint(113.4232170000,23.1788310000);
    
    // var mark = null;
    var uavIcon1 = new BMap.Icon("/theme/static/images/monitor/uav_01.png", new BMap.Size(26,26)); //无人机
    var uavIcon2 = new BMap.Icon("/theme/static/images/monitor/uav_02.png", new BMap.Size(26,26)); //无人机
    var siteIcon1 = new BMap.Icon("/theme/static/images/monitor/site_01.png", new BMap.Size(28,79)); //站点
    var siteIcon2 = new BMap.Icon("/theme/static/images/monitor/site_02.png", new BMap.Size(28,79)); //站点
    map.centerAndZoom(pot,19);
    map.enableScrollWheelZoom(true);


//------------------画点线------------------

   function drawAirline(p1,p2){
        if(p1.pot) this.pot1 = p1.pot;
        if(p2.pot) this.pot2 = p2.pot;
        if(!this.pot1 && p1.lat && p1.lng){this.pot1 = BPoint(p1.lng,p1.lat);}
        if(!this.pot2 && p2.lat && p2.lng){this.pot2 = BPoint(p2.lng,p2.lat);}
        this.marker1 = new BMap.Marker(this.pot1,{icon:siteIcon1});
        this.marker2 = new BMap.Marker(this.pot2,{icon:siteIcon2});
        //label样式
        var labelOption = {"padding":"3px 10px","border":"0","background":"rgba(255,255,255,0.9)","textAlign":"center","lineHeight":"22px","color":"blue","borderRadius":"3px"};
        var lineOption = {strokeColor:"yellow", strokeWeight:2, strokeOpacity:0.8};     //航线样式
        this.airline = new BMap.Polyline([this.pot1,this.pot2],lineOption);
        this.label1 = new BMap.Label(p1.title,{position:this.pot1,offset:new BMap.Size(20,-40)});
        this.label2 = new BMap.Label(p2.title,{position:this.pot2,offset:new BMap.Size(20,-40)});
        this.label1.setStyle(labelOption);
        this.label2.setStyle(labelOption);
        
        map.panTo(new BMap.Point((this.pot1.lng+this.pot2.lng)/2,(this.pot1.lat+this.pot2.lat)/2));

        map.addOverlay(this.marker1);
        map.addOverlay(this.marker2);
        map.addOverlay(this.label1);
        map.addOverlay(this.label2);
        map.addOverlay(this.airline);
        this.clear = function(){
            map.removeOverlay(this.marker1);
            map.removeOverlay(this.marker2);
            map.removeOverlay(this.label1);
            map.removeOverlay(this.label2);
            map.removeOverlay(this.airline);
        }
    }

    //-------------无人机------------------
    function UAV(point) {
        var maker = new BMap.Marker(point, {icon: uavIcon1});
        var currentPoint = point;
        var deg = 90;
        maker.setRotation(deg);
        map.addOverlay(maker);
        this.update = function (data) {
            var pot = new BPoint(data.longitude, data.latitude);
            maker.setPosition(pot);
            if (pot.lat != currentPoint.lat || pot.lng != currentPoint.lng) {
                deg = Math.atan2(pot.lat - currentPoint.lat, pot.lng - currentPoint.lng) * 180 / Math.PI;
                maker.setRotation(90 - deg);
            }
            currentPoint = pot;
        }
        this.clear = function () {
            map.removeOverlay(maker);
        }
        this.changeIcon = function(){
            if(maker.getIcon() == uavIcon1){
                maker.setIcon(uavIcon2);
                maker.setTop(true);
                maker.setRotation(deg);
            }else{
                maker.setIcon(uavIcon1);
                maker.setRotation(deg);
            }
        }
        this.setToRed = function(){
            maker.setIcon(uavIcon2);
            maker.setTop(true);
            maker.setRotation(90-deg);
        }
        this.setToBlue = function(){
            maker.setIcon(uavIcon1);
            maker.setTop(false);
            maker.setRotation(90-deg);
        }
    }

    //var u = new UAV(pot); 
    var u = null;

//--------------------------回放----------------------------------

   
    var index = 0;
    var speed = 1000;
    var animationSpeed = 1;
    var data = null;
    var flag = true;   //判断进度条 true:点击事件  false:拖拽事件

    var airline = null;
    Net.get('/flight/flight/get_flight_basic_info',{flight_id:qs.get('id')},function(data){
        if(data.status == '200'){
            var p1 = {lng:data.data.from.longitude,lat:data.data.from.latitude,title:data.data.from.name};
            var p2 = {lng:data.data.to.longitude,lat:data.data.to.latitude,title:data.data.to.name};
            
            airline = new drawAirline(p1,p2);
        }else{
            UI.status(data.message);
        }
        
    });
    //一次性获取所有数据
    Net.get('/flight/flight/replay',{id:qs.get('id')},function(result){
        data = result.data;
        u = new UAV(BPoint(data[0].longitude*1,data[0].latitude*1));
        var mlng = (data[0].longitude*1+data[data.length-1].longitude*1)/2;
        var mlat = (data[0].latitude*1+data[data.length-1].latitude*1)/2;
        map.panTo(BPoint(mlng,mlat));   //地图为航线中点

        $('.player-time').html(setProgressTime(data.length));
        var barWidth = $('.player-bar').width()+2;
        var unitLen = barWidth/data.length;

        var timer = null;
        var player = {
            start:start,
            pause:pause,
            endcallback:endcallback
        }
        player.start();

        function start(ix){
            index = typeof(ix)!= 'number' ? (index>=data.length?data.length-1:index) : ix;
            //ts = (!!ts && typeof(ts) == 'number' && ts > 0 ) ? ts : 1000;
            setAnimation(animationSpeed);
            if(timer){clearInterval(timer)}
            timer = setInterval(function(){
                rebind(index);
                if(++index >= data.length){
                    if(timer){
                        clearInterval(timer);
                        timer = null;
                        player.endcallback && player.endcallback();
                    }
                }
            },speed);
            $('#player-control').removeClass('player-pause').addClass('player-start');
        }
        function pause(){
            if(timer){clearInterval(timer);}
            $('#player-control').removeClass('player-start').addClass('player-pause');
        }
        function endcallback(){
            $('#player-control').removeClass('player-start').addClass('player-pause');
            index = 0;
            $('.player-now').html('00:00');
            clearAnimation();
            setProgress(0);
        }
        $('.player-btn').click(function(){
            var child = $('#player-control');
            if(child.hasClass('player-start')){
                child.removeClass('player-start').addClass('player-pause');
                player.pause();
            }else{
                child.removeClass('player-pause').addClass('player-start');
                player.start();
            }
        });

        function rebind(ix){
            $('.player-now').html(setProgressTime(index));
            setProgress((ix+1)*unitLen);
            if(data[ix] != null && JSON.stringify(data[ix])!='{}'){
                Data.bind(data[ix],'','',{'create_at':['data-create','create_at']});
                $('[data-create]').html(new Date($('[data-create]').attr('data-create')*1000).format('yyyy-MM-dd HH:mm:ss'));
               
                u.update({longitude:data[ix].longitude,latitude:data[ix].latitude});
            }
        }
        
        function setProgressTime(ix){
            ix =  (ix && ix >= 0) ? ix : 0;
            var sec = ix % 60;
            var min = Math.floor(ix / 60);
            if(sec<10) sec = '0'+sec;
            if(min<10) min = '0'+min;
            return min+':'+sec;
        }

        //快进
        $('.player-quick').click(function() {
            switch(speed){
                case 1000:{speed = 500;animationSpeed=0.5;$('.player-speed').html('2');break;}
                case 500:{speed = 200;animationSpeed=0.2;$('.player-speed').html('5');break;}
                case 200:{speed = 100;animationSpeed=0.1;$('.player-speed').html('10');break;}
                case 100:{speed = 50;animationSpeed=0.05;$('.player-speed').html('20');break;}
                case 50:{break;}
            }
            player.start();
        });
        //快退
        $('.player-low').click(function() {
            switch(speed){
                case 50:{speed = 100;animationSpeed=0.1;$('.player-speed').html('10');break;}
                case 100:{speed = 200;animationSpeed=0.2;$('.player-speed').html('5');break;}
                case 200:{speed = 500;animationSpeed=0.5;$('.player-speed').html('2');break;}
                case 500:{speed = 1000;animationSpeed=1;$('.player-speed').html('1');break;}
                case 1000:{break;}
            }
            player.start();
        });

        $('.player-bar').click(function(e) {
            if(flag){
                setProgress(e.offsetX);
                var p = e.offsetX/barWidth;
                p = p == 1 ? 0.999 : p;
                var i = Math.floor(p*data.length);
                player.start(i);
                clearAnimation();
                setProgress(e.offsetX);
                setAnimation(animationSpeed);
            }else{
                flag = true;
            }
        });

        var progress = new window.E.drag($("#player-pointer")[0],'left');

        progress.onmovestart(function(){
            //开始移动
            player.pause();
            clearAnimation();
        });
        progress.onmoveend(function(e){
            //移动后
            var p = $('.player-line').width()/barWidth;
            p = p == 1 ? 0.999 : p;
            var i = Math.floor(p*data.length);
            player.start(i);
            //可能会触发点击事件
        });
        progress.onmove(function(){
            //移动中
            flag = false;
            $('.player-line').width($("#player-pointer").css('left'));
            if(parseInt($("#player-pointer").css('left')) >= barWidth){
                setProgress(barWidth);
            }
        });
        function setAnimation(t){
            $('.player-point').css({'transition':t+'s linear'});
            $('.player-line').css({'transition':t+'s linear'});
        }
        function clearAnimation(){
            $('.player-line').css({'transition':'0s'});
            $('.player-point').css({'transition':'0s'});
        }
        function setProgress(w){
            $("#player-pointer").css('left',w);
            $('.player-line').width(w);
        }
    });

  


});
