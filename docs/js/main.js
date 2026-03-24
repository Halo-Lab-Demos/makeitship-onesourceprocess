/**
 * main.js - Vanilla JS for One Source Process demo site
 * Handles: mobile nav toggle, accordion, smooth scroll, active states
 */
(function ($) {
  'use strict';

  // -------------------------------------------------------------------------
  // Mobile navigation toggle
  // -------------------------------------------------------------------------
  $(document).on('click', '.burger.icon_menu', function () {
    $('.main_menu').addClass('open').show();
    $('.burger.icon_menu').hide();
    $('.close_menu.icon_menu').show();
    $('body').addClass('menu-open');
  });

  $(document).on('click', '.close_menu.icon_menu', function () {
    $('.main_menu').removeClass('open').hide();
    $('.burger.icon_menu').show();
    $('.close_menu.icon_menu').hide();
    $('body').removeClass('menu-open');
  });

  // Close menu when clicking outside
  $(document).on('click', function (e) {
    if (
      $('body').hasClass('menu-open') &&
      !$(e.target).closest('.main_menu, .burger, .close_menu').length
    ) {
      $('.main_menu').removeClass('open').hide();
      $('.burger.icon_menu').show();
      $('.close_menu.icon_menu').hide();
      $('body').removeClass('menu-open');
    }
  });

  // -------------------------------------------------------------------------
  // Accordion
  // -------------------------------------------------------------------------
  $(document).on('click', '.accordion__title', function () {
    var $item = $(this).closest('.accordion__item');
    var $content = $item.find('.accordion__content');
    var $arrow = $item.find('.accordion__arrow');
    var isOpen = $item.hasClass('active');

    // Close all accordion items in the same parent accordion
    var $accordion = $item.closest('.accordion');
    $accordion.find('.accordion__item').not($item).each(function () {
      $(this).removeClass('active');
      $(this).find('.accordion__content').slideUp(300);
      $(this).find('.accordion__arrow').removeClass('open');
    });

    // Toggle clicked item
    if (isOpen) {
      $item.removeClass('active');
      $content.slideUp(300);
      $arrow.removeClass('open');
    } else {
      $item.addClass('active');
      $content.slideDown(300);
      $arrow.addClass('open');
    }
  });

  // -------------------------------------------------------------------------
  // Swiper initialization (if swiper is loaded)
  // -------------------------------------------------------------------------
  $(document).ready(function () {
    // Testimonials swiper
    if (typeof Swiper !== 'undefined') {
      // Reviews / testimonials slider
      var reviewsSliders = document.querySelectorAll('.reviews-slider, .swiper-reviews');
      reviewsSliders.forEach(function (el) {
        new Swiper(el, {
          slidesPerView: 1,
          spaceBetween: 20,
          loop: true,
          autoplay: {
            delay: 5000,
            disableOnInteraction: false,
          },
          pagination: {
            el: el.querySelector('.swiper-pagination') || '.swiper-pagination',
            clickable: true,
          },
          navigation: {
            nextEl: el.querySelector('.swiper-button-next') || '.swiper-button-next',
            prevEl: el.querySelector('.swiper-button-prev') || '.swiper-button-prev',
          },
          breakpoints: {
            768: {
              slidesPerView: 2,
              spaceBetween: 24,
            },
            1200: {
              slidesPerView: 3,
              spaceBetween: 30,
            },
          },
        });
      });

      // Generic swiper containers
      var genericSwipers = document.querySelectorAll('.swiper-container:not(.reviews-slider):not(.swiper-reviews)');
      genericSwipers.forEach(function (el) {
        new Swiper(el, {
          slidesPerView: 1,
          spaceBetween: 20,
          loop: false,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
        });
      });
    }

    // -------------------------------------------------------------------------
    // Smooth scroll for anchor links
    // -------------------------------------------------------------------------
    $('a[href^="#"]').not('[href="#"]').on('click', function (e) {
      var target = $(this.getAttribute('href'));
      if (target.length) {
        e.preventDefault();
        $('html, body').animate(
          { scrollTop: target.offset().top - 80 },
          600,
          'swing'
        );
      }
    });

    // -------------------------------------------------------------------------
    // Sticky header on scroll
    // -------------------------------------------------------------------------
    var $header = $('.header');
    if ($header.length) {
      $(window).on('scroll', function () {
        if ($(this).scrollTop() > 80) {
          $header.addClass('scrolled');
        } else {
          $header.removeClass('scrolled');
        }
      });
    }
  });

})(jQuery);
