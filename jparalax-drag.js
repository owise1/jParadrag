(function( $ ) {
  $.fn.jParadrag = function(o) {
    var opts = $.extend( {
		width 			: 600,
		height			: 400,
		startingZIndex 	: 1,
		startPosition 	: null,
		factor 			: 2,
		loop			: true,
		momentum		: {
			avg 	  : 3,
			friction  : 0.4
		},
		onDrag 			: function(){  },
		onDragStop 		: function(){  },
		onLoad			: function(){  }
    }, o);

	// TODO: momentum only compatible with looping
	if(!opts.loop && opts.momentum) opts.momentum = false;
	
	// returns the x of the middle image
	function _middle_x(left_x, width){
		if(!opts.loop) return left_x;
		
		if(left_x > -width){
			return left_x - width;
		} else if(left_x < -(2*width)){
			return left_x + width;
		}
		return left_x;
	}
	
	return this.each(function(){
		var $self             = $(this),
			self              = this,
			li_count          = $('li', this).length,
			img_count         = $(this).find('img').length,
			images_loaded     = 0,
			drags             = [],
			velocity          = 0,
			momentum_interval = null;
			
			
		var methods = {
			drag : function(ev, ui){
				var left_x,
					sum_time = 0,
					sum_distance = 0;
					
				
				if(typeof ev === 'object'){
					left_x =  ui.position.left;
					
					if(opts.momentum){ // calculate velocity
						drags.push({ timestamp : ev.timeStamp, position : left_x });
						drags = drags.slice(-opts.momentum.avg);
						if(drags.length >= opts.momentum.avg){
							for(var i in drags){
								if(i > 0){
									var current_drag = drags[i];
									var last_drag    = drags[i-1];

									sum_distance += current_drag.position - last_drag.position;
									sum_time += current_drag.timestamp - last_drag.timestamp;
								}
							}
							velocity = sum_distance / sum_time;
						}
					}
					
				} else {
					left_x = ev;
					
				}
				methods.move_layers(left_x);
			},
			move_to : function(left_x){
				$('li:last', $self).css({ left : left_x });
				methods.drag(left_x);
			},
			reset : function(){
				$('li', $self).each(function(i){
					$(this).css('left', _middle_x(parseInt($(this).css('left')), $(this).data('jParadrag.width')));
				});
			},
			stop_drag : function(ev, ui){
				methods.reset();
				
				if(opts.momentum){
					var interval = 41; // 24 fps
					momentum_interval = setInterval(function(){
						var left_x = parseInt($('li:last', $self).css('left'));
						
						if(Math.abs(velocity) <= opts.momentum.friction + 0.01) clearInterval(momentum_interval);
						
						if(velocity >= 0) velocity -= opts.momentum.friction;
						else velocity += opts.momentum.friction;
						methods.move_to(left_x + velocity * interval);
						methods.reset();
					}, interval);
				}
			},
			move_layers : function(front_x){
				$('li', $self).each(function(i){
					if(i == li_count - 1) return;
					
					var last_spot = $(this).data('jParadrag.last_spot'),
					 	f = (1+i) * opts.factor, 
						my_left;
						
					if(last_spot){
						var diff = parseInt(last_spot) - _middle_x(front_x, $(this).data('jParadrag.width'));
						var sign = diff > 0 ? '-=' : '+=';
						if(Math.abs(diff) < opts.width)
							$(this).css({ left : sign + parseInt(Math.abs(diff) / f) + 'px' });
						
					} else {
						$(this).css({ left : _middle_x(front_x / f, $(this).data('jParadrag.width')) });
					}
					$(this).data('jParadrag.last_spot', _middle_x(front_x, $(this).data('jParadrag.width')));
					
				})
			}
		}
		
		function init(){
			$self.css({
				position : 'relative',
				margin   : 0,
				padding  : 0,
				width    : opts.width,
				height   : opts.height,
				overflow : 'hidden',
				'list-style' : 'none'
			}).fadeIn();
			$('#_jparadrag_placeholder').remove();
			
			$('li', self)
				.css({
					position : 'absolute',
					top: 0,
					left: 0
				})
				.each(function(i){
					var my_img = $('img', this),
						img_width = $(this).data('jParadrag.width'),
						starting_position,
						draggable_opts = {
							axis : 'x',
							drag : function(ev, ui){ 
								if(!$self.data('jParadrag.draggin')){
									$self.data('jParadrag.draggin', true);
									opts.onDrag();
								} 
								methods.drag(ev, ui);
							},
							stop : function(ev, ui){
								if($self.data('jParadrag.draggin')){
									$self.data('jParadrag.draggin', false);
									opts.onDragStop();
								} 
								methods.stop_drag(ev, ui);
							}
						};

					if(opts.loop){
						$(this).css({
							'z-index': opts.startingZIndex + i,
							'width' : img_width * 3
						});

						$(this)
							.append(my_img.clone())
							.prepend(my_img.clone())
							.find('img')
								.css({
									display : 'block',
									float : 'left'
								});
						starting_position = opts.startPosition ? -(opts.startPosition + img_width) : -(img_width * 1.5);
						
					// not looping
					} else {
						$(this).css({
							'z-index': opts.startingZIndex + i,
							'width' : img_width
						});

						$(this)
							.find('img')
								.css({
									display : 'block',
									float : 'left'
								});
						starting_position = opts.startPosition ? -(opts.startPosition) : -(img_width * 0.5);
						var how_far_left = $(window).width() < opts.width ? img_width - opts.width : opts.width-$(this).offset().left;
						draggable_opts.containment = [-how_far_left,0,$(this).offset().left-2,opts.height];
					}
					

					// the front li
					if(i == li_count - 1){
						$(this).draggable(draggable_opts);
						
						methods.move_to(starting_position);
					} 
				});
				opts.onLoad();
		}
		
		$self.hide().after($("<div id='_jparadrag_placeholder'>").css({ width : opts.width, height :  opts.height }));
		$self.find('img').each(function(){
			var i    = new Image();
			i.src    = $(this).attr('src');
			var me   = $(this);
			i.onload = function(){
				me.closest('li').data('jParadrag.width', this.width);
				images_loaded++;
				if(images_loaded == img_count) init();
			}
		})
			
		
	});

  };
})( jQuery );
