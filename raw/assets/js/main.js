var $ = jQuery.noConflict();

$(document).ready(function ($) {

	//SLIDERS

	$('.swiper-container').each(function (index) {
		var count = index + 1;
		var swiper = new Swiper(".slider_" + count + "", {
			slidesPerView: 'auto',
			spaceBetween: 20,
			mousewheelControl: true,
			breakpoints: {
				820: {
					spaceBetween: 40,
				},
			}
		});
	});


	let swiper;

	function renderSlider() {
		if (swiper) {
			swiper.destroy(true, true);
		}
		if (typeof Swiper !== 'undefined') {
			swiper = new Swiper(".mySwiper", {
				slidesPerView: 1,
				spaceBetween: 24,
				observer: true,
				observeParents: true,
				speed: 1000,
				// effect: "creative",
				loop: true,
				mousewheel: false,
				autoplay: {
					delay: 5000,
					disableOnInteraction: false,
				},
				navigation: {
					nextEl: ".mobile .slider-button-next",
					prevEl: ".mobile .slider-button-prev",
				},
				breakpoints: {
					0: {
						simulateTouch: true,
						allowTouchMove: true,
					},

					1024: {
						simulateTouch: false,
						allowTouchMove: false,
						navigation: {
							nextEl: ".desktop .slider-button-next",
							prevEl: ".desktop .slider-button-prev",
						},
					},
				},
				on: {
					init: function () {
						adjustHeight();
					},
					slideChange: function () {
						adjustHeight();
					},
					slideChangeTransitionStart: function () {
						let slide_number =
							$(".mySwiper .swiper-slide-active").data("swiper-slide-index") + 1;
						const originalSlidesCount =
							this.slides.length - this.loopedSlides * 2;
						let count = (slide_number * 100) / originalSlidesCount;
						$(".progressbar-status").css("width", count + "%");
					},
				},
			});
		}
	};

	window.addEventListener('resize', renderSlider);
	renderSlider();

	function adjustHeight() {
		const slides = document.querySelectorAll('.info-slider__slides .swiper-slide');
		let maxHeight = 0;

		slides.forEach(slide => {
			const slideHeight = slide.offsetHeight;
			if (slideHeight > maxHeight) {
				maxHeight = slideHeight;
			}
		});
		console.log(maxHeight);
		const swiperContainer = document.querySelector('.mySwiper');
		swiperContainer.style.height = `${maxHeight}px`;
	}

	// Lightbox fix

	let scrollTop = 0;
	$('.fancybox img').ready(function () {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach(mutation => {
				console.log($('.fancybox img'));
				const lightbox = document.querySelector('#fancybox-wrap');
				scrollTop = $('.fancybox img').offset().top;
				if (lightbox && $('#fancybox-wrap').attr('aria-hidden') === 'false') {
					
				} else if ($('#fancybox-wrap').attr('aria-hidden') === 'true') {
					document.body.style.position = '';
					document.body.style.top = '';
					document.body.classList.remove('no-scroll');
					window.scrollTo(0, scrollTop - 200);
					observer.disconnect();
				}
			});
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	});


	//MENU

	initMegaMenu();

	$(window).on('resize', function () {
		initMegaMenu();
	});

	function initMegaMenu() {
		if ($(window).width() < 767) {
			$(".burger").on('click', function (e) {
				$('.main_menu').addClass('active');
				$('.close_menu').show();
				$('.burger').hide();
				$('body').addClass('overflow_body');
				$('.bg_menu').addClass('active');
			});
			$(".close_menu").on('click', function (e) {
				$('.main_menu').removeClass('active');
				$('.close_menu').hide();
				$('.burger').show();
				$('body').removeClass('overflow_body');
				$('.bg_menu').removeClass('active');
			});
		} else {
			resetMenuState();
		}
	}

	function resetMenuState() {
		$('.main_menu').removeClass('active');
		$('.icon_menu').removeAttr("style");
		$('body').removeClass('overflow_body');
		$('.bg_menu').removeClass('active');
	}

	$(".accordion__item").on("click", function (e) {

		e.preventDefault();
		var $this = $(this);

		if (!$this.hasClass("accordion-active")) {
			$(".accordion__content").slideUp(300);
			$(".accordion__title").removeClass("accordion-active");
			$('.accordion__arrow').removeClass('accordion__rotate');
		}

		$this.toggleClass("accordion-active");
		$this.find('.accordion__content').slideToggle(300);
		$('.accordion__arrow', this).toggleClass('accordion__rotate');
	});

	if ($('.module__map').length > 0) {
		$(window).scroll(function () {
			var wt = $(window).scrollTop();
			var wh = $(window).height();
			var et = $('.module__map').offset().top;
			var eh = $('.module__map').outerHeight();
			var dh = $(document).height();
			if (wt + wh >= et || wh + wt == dh || eh + et < wh) {
				$('.marks').addClass('active');
			}
		});
	}

	$(".module__accordion .title_box").on("click", function () {
		if ($(this).parent().hasClass("active")) {
			$(this).parent().removeClass("active");
			$(this).find(".icon").removeClass("rotate");
		} else {
			$(this).parent().addClass("active");
			$(this).find(".icon").addClass("rotate");
		}
	});

	$(".see_all_reviews").on("click", function () {
		$('.wrapper_list_rev').addClass('active');
		$(this).remove();

		return false;
	});

	var lastScrollTop = 0, delta = 15;
	$(window).scroll(function (event) {
		var st = $(this).scrollTop();

		if (Math.abs(lastScrollTop - st) <= delta)
			return;
		if ((st > lastScrollTop) && (lastScrollTop > 0)) {
			// downscroll code
			$("header").css("top", "-84px");
			$("header .sub-menu").hide();

		} else {
			// upscroll code
			$("header").css("top", "0px");
			$("header .sub-menu").show();
		}
		lastScrollTop = st;
	});

	$('.read-more-button').on('click', function () {
		const $container = $(this).closest('.wrap_text');
		const $content = $container.find('.text-content');

		if ($content.hasClass('expanded')) {
			$content.removeClass('expanded');
			$(this).text('Read More');
		} else {
			$content.addClass('expanded');
			$(this).text('Read Less');
		}
	});
});

$(document).ready(() => {
	$(".hero").addClass("load");
});
