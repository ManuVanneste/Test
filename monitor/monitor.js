

function sleep(ms=Math.random()*3, fail=false) {
	fail=fail||(ms*4<1)
	ms=ms*1000;
	// ms=ms*(fail===true?0:1);
    return new Promise((resolve,reject) => {
		setTimeout(() => {
		if (fail) reject(ms)
		else resolve(ms)
	}, ms);
  });
}

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.Monitor = factory());
}(this, (function () { 'use strict';

	var NOW;
	if (typeof self === 'undefined' && typeof process !== 'undefined' && process.hrtime) {
		NOW = function () {
			var time = process.hrtime();
			return time[0] * 1000 + time[1] / 1000000;
		};
	}
	else if (typeof self !== 'undefined' && self.performance !== undefined && self.performance.now !== undefined) {
		NOW = self.performance.now.bind(self.performance);
	}
	else if (Date.now !== undefined) {
		NOW = Date.now;
	}
	else {
		NOW = function () {
			return new Date().getTime();
		};
	}
	var NOW$1 = NOW;


	var Element = /** @class */ (function () { 
		function Element( f, parent, child, f_final, f_error) {
			if (typeof f === 'object') {
				this.f = f.f;
				this.parent = f.parent;
				this.child = f.child;
				this.f_final = f.f_final;
				this.f_final = f.f_final;
			}
			else {
				this.f = f;
				this.parent = parent;
				this.child = child;
				this.f_final = f_final;
				this.f_final = f_error;
			}

			this._isFinished=false
			this._isRunning=false


		}
		return Element;
	}());

	var Group = /** @class */ (function () {
        function Group() {
            this._functions = [];
			this._startTime = 0;
			this._stopTime = 0;
			this._isFinished = false;

			this._onStartCallback=function(){ console.log('*** START ***') }
			this._onCompleteCallback=function(){ console.log('*** COMPLETE ***') }
			this._onRejectedCallback=function(){ console.log('*** REJECTED ***') }

			this._abort = new AbortController();
			// this._abort.signal.addEventListener('abort',() => {
			// reject(error);
			// });
					}
		Group.prototype = {
			get _isRunning() {
				return this._functions.map(x=>x._isRunning).reduce((a,b)=>a||b,false)
			}
		}

		Group.prototype.add = function (fnctn) {
			var new_element=new Element ( fnctn )
			new_element.group=this
            this._functions.push ( new_element );
        };

		Group.prototype.abort = function () {
            this._abort.abort();
        };
	
		Group.prototype.reset = function () {
			functions._functions.forEach(x=>x._isFinished=false)
		}

        Group.prototype.Watch = function ( callback ) {
            return new Watch( this , callback );
        };
        Group.prototype.WatchAll = function ( callback ) {
			
			if (this._isRunning) {
				console.warn('Groep wordt reeds uitgevoerd!')
				if (typeof this._onCompleteCallback==='function') this._onCompleteCallback()
				return
			}

			console.warn('WatchAll gestart... ')
			if (typeof this._onStartCallback==='function') this._onStartCallback()
            return new WatchAll( this , callback );
        };

		Group.prototype.onRejected = function (callback) {
            this._onRejectedCallback = callback;
            return this;
        };
		Group.prototype.onStart = function (callback) {
            this._onStartCallback = callback;
            return this;
        };
		Group.prototype.onComplete = function (callback) {
            this._onCompleteCallback = callback;
            return this;
        };
		
        return Group;
    }());

    var VERSION = '1.0.0';

	class Monitor
	{
		constructor( fs ){
			return (async ()=> {
				const statusesPromise  =  Promise.allSettled(fs)
				return {performance: performance.now(), statusesPromise:await statusesPromise}
			})();
		}
	}

	class Watch
	{
		constructor( fs, f ){

			var breakOnRejected = false;

			return new Monitor(fs.map(x=>x.promise))
			.then(statuses=>{
				console.log('took:', performance.now()-statuses.performance)
				console.log('statuses:', statuses.statusesPromise.map(x=>x.status).join(','))
				breakOnRejected = statuses.statusesPromise.map(x=>x.status).includes('rejected')
			})
			.catch(err=>{
				console.warn('error:', err)
			})
			.finally(()=>{
				if (breakOnRejected) {
					console.warn('Afgebroken omwille van een afgewezen belofte...')
					var fs0=fs[0]
					if (fs0.group&&typeof fs0.group._onRejectedCallback==='function') fs0.group._onRejectedCallback()
					if (fs0.group&&typeof fs0.group._onCompleteCallback==='function') fs0.group._onCompleteCallback()
					return
				}
				else {
					if (typeof f === 'function') 
						f()
					if (Array.isArray(f))
						f.forEach(f=>typeof f === 'function'&&f())
				}
				})
		}
	}

	var _sequence=0
	function WatchAll(group, parent, callback ){

		var functions=group._functions

		if (functions.map(f=>f._isFinished).reduce((a,b)=>a&&b,true)) {
			console.warn('WatchAll afgerond!')
			if (typeof group._onCompleteCallback==='function') group._onCompleteCallback()
			return
		}

		if (typeof parent==='function') {
			callback = parent
			parent = undefined
		}

		var children=functions.filter(x=>x.parent===parent)

		if (parent===undefined) {
			if (children.length===0) {
				console.warn('Niets te doen... ')
				if (typeof group._onCompleteCallback==='function') group._onCompleteCallback()
				return
			}
			_sequence=0
			functions.forEach((x,i)=>x._index=i)
		}

		if (children.length>0){
			children.forEach(child=>{
				child._isRunning=true
				child.sequence=_sequence

				// child.f = /** @class */ (function (_super) {
				// 	__extends(Main, _super);
				// 	function Main() {
				// 		var _this = _super !== null && _super.apply(this, arguments) || this;
				// 		child.group._abort.signal.addEventListener('abort',() => {	
				// 			reject(error);	
				// 		}) ;
				// 		return _this;
				// 	}
				// 	return Main;
				// }( child.f ));

				// eval('child.f='+child.f.prototype
				// 					.constructor
				// 					.toString()
				// 					.replaceAll(/1\+1/g,'1+2'))


				child.promise=child.f()

			})
			
			var f_final=children.map(child=>child.f_final)

			new Watch(
				
				children, 

				[
			
					...f_final,

					function(){

						children.forEach(child=>{
							child._isRunning=false
							child._isFinished=true
							})

						if (  (!functions.map(x=>x._isRunning).reduce((a,b)=>a||b,false)) && 
								functions.filter(x=>x._isFinished===false).length===0 ) {
								
									if (typeof callback === 'function')
										callback()
						}

						_sequence++

						functions
							.filter(x=>x.parent===parent)
							.map(x=>x.child)
							.forEach(x=>{
								WatchAll(group, x, callback)
							})
					}

				]

			)
		}
	}


    var __extends = (this && this.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();

    var Main = /** @class */ (function (_super) {
        __extends(Main, _super);
        function Main() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.version = VERSION;
            _this.Group = Group;
            // _this.Watch = Watch;
            // _this.WatchAll = WatchAll;
            _this.Element = Element;
            return _this;
        }
        return Main;
    }(Group));

    var _ = new Main();
    return _;

})));

/*


var functions=new Monitor.Group()
functions.add( { parent: undefined, child: 'a', f: function() { return sleep ( 2 ); }, f_final: function(){ console.log('done 1'); } } )
functions.add( { parent: 'a',  child: 'b', f: function() { return sleep ( 2 ); }, f_final: function(){ console.log('done 2'); } } )
functions.add( { parent: 'a',  child: 'g', f: function() { return sleep ( 2 ); }, f_final: function(){ console.log('done 3'); } } )
functions.add( { parent: 'a',  child: 'f', f: function() { return sleep ( 2 ); }, f_final: function(){ console.log('done 4'); } } )
functions.add( { parent: 'b',  child: 'c', f: function() { return sleep ( 2 ); }, f_final: function(){ console.log('done 5'); } } )
functions.add( { parent: 'b',  child: 'h', f: function() { return sleep ( 2 ); }, f_final: function(){ console.log('done 6'); } } )
functions.add( { parent: 'c',  child: 'd', f: function() { return sleep ( 2 ); }, f_final: function(){ console.log('done 7'); } } )
functions.add( { parent: 'd',  child: 'e', f: function() { return sleep ( 2 ); }, f_final: function(){ console.log('done 8'); } } )

*/