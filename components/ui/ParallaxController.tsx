'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function ParallaxController() {
  useEffect(() => {
    try {
      gsap.registerPlugin(ScrollTrigger);

      const mm = gsap.matchMedia();

      // 1. Desktop & Tablet: Parallax multicapa sutil + transiciones suaves por sección
      mm.add(
        '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
        () => {
          // Fondo decorativo de las secciones principales (movimiento sutil por capas)
          const bgElements = gsap.utils.toArray<HTMLElement>('[data-parallax-bg]');
          bgElements.forEach((el) => {
            const speedAttr = parseFloat(el.dataset.parallaxBg || '36');
            const section = el.closest('section') || el.parentElement;
            if (!section) return;
            gsap.fromTo(
              el,
              { y: -speedAttr * 0.35 },
              {
                y: speedAttr,
                ease: 'none',
                force3D: true,
                scrollTrigger: {
                  trigger: section,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.8,
                },
              }
            );
          });

          // Encabezados de sección: entrada suave y estable al hacer scroll
          const headers = gsap.utils.toArray<HTMLElement>('[data-parallax-header]');
          headers.forEach((header) => {
            if (!header) return;
            gsap.fromTo(
              header,
              { y: 22, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.65,
                ease: 'power2.out',
                clearProps: 'transform',
                scrollTrigger: {
                  trigger: header,
                  start: 'top 88%',
                  toggleActions: 'play none none none',
                },
              }
            );
          });

          // Bloques de contenido / tarjetas / formularios: transición suave manteniendo estabilidad total al terminar
          const contents = gsap.utils.toArray<HTMLElement>('[data-parallax-content]');
          contents.forEach((content) => {
            if (!content) return;
            gsap.fromTo(
              content,
              { y: 20, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.7,
                ease: 'power2.out',
                clearProps: 'transform',
                scrollTrigger: {
                  trigger: content,
                  start: 'top 88%',
                  toggleActions: 'play none none none',
                },
              }
            );
          });

          // Elementos individuales en grillas (tarifas, pasos, canales de contacto)
          const staggerGroups = gsap.utils.toArray<HTMLElement>('[data-parallax-stagger]');
          staggerGroups.forEach((group) => {
            if (!group) return;
            const items = group.querySelectorAll<HTMLElement>('[data-parallax-item]');
            if (!items.length) return;
            gsap.fromTo(
              items,
              { y: 18, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.55,
                stagger: 0.08,
                ease: 'power2.out',
                clearProps: 'transform',
                scrollTrigger: {
                  trigger: group,
                  start: 'top 86%',
                  toggleActions: 'play none none none',
                },
              }
            );
          });
        }
      );

      // 2. Móvil: Movimiento reducido para priorizar lectura y rendimiento fluido
      mm.add(
        '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        () => {
          const mobileBlocks = gsap.utils.toArray<HTMLElement>(
            '[data-parallax-header], [data-parallax-content]'
          );
          mobileBlocks.forEach((block) => {
            if (!block) return;
            gsap.fromTo(
              block,
              { y: 10, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.45,
                ease: 'power2.out',
                clearProps: 'transform',
                scrollTrigger: {
                  trigger: block,
                  start: 'top 92%',
                  toggleActions: 'play none none none',
                },
              }
            );
          });
        }
      );

      // 3. Accesibilidad: Respetar preferencia del sistema por reducir movimiento
      mm.add('(prefers-reduced-motion: reduce)', () => {
        const targets = gsap.utils.toArray<HTMLElement>(
          '[data-parallax-header], [data-parallax-content], [data-parallax-item]'
        );
        if (targets.length) {
          gsap.set(targets, {
            clearProps: 'all',
            opacity: 1,
            y: 0,
          });
        }
      });

      return () => {
        mm.revert();
      };
    } catch (err) {
      console.warn('ParallaxController bypassed:', err);
    }
  }, []);

  return null;
}
