# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos roles, elegidos al crear la cuenta. (1) Emprendedores que quieren abrir una microempresa en México o Latinoamérica, normalmente con poca experiencia y un presupuesto de $50 a $500,000 MXN: son el usuario principal. (2) Proveedores de servicios y productos —abogados, contadores, asesores financieros, marketing (humano o agente de IA), gestoría, insumos— que se registran para ser encontrados exactamente cuando un emprendedor llega al paso de la ruta en el que ayudan.

## Product Purpose

Tlacuachip ayuda a transformar una idea de negocio en una decisión informada: entiende el mercado local, compara zonas y acompaña los siguientes pasos de apertura.

## Positioning

La propuesta diferencial es convertir señales locales —oferta real de OpenStreetMap, demanda estimada y costo operativo— en una lectura accionable antes de que una persona comprometa su dinero en una ubicación.

## Operating Context

Flujo principal: crear cuenta, describir el negocio, decidir qué datos puede ver la red, interpretar tres mapas, elegir o confirmar zona y operar el negocio desde un dashboard con roadmap, mentores y proveedores. La ruta de formalización vigente se limita a México: distingue pasos base, requisitos condicionales por giro/municipio y evidencia que el usuario conserva.

## Capabilities and Constraints

- Frontend React + TypeScript + Vite; API Express en `server/`.
- Oferta/competencia: puntos de interés de OpenStreetMap consultados por Overpass.
- Demanda y costos: estimaciones del prototipo; deben presentarse como tales.
- Datos del perfil se persisten localmente en esta versión; el usuario puede editar visibilidad y eliminar su registro desde Configuración.
- Matching de equipo y lectura de indicadores con IA vía OpenRouter (`server/`); la IA recibe solo el perfil minimizado según la visibilidad elegida, el usuario puede ver ese payload exacto antes de enviarlo, y sin clave configurada todo cae a un ranking local declarado como tal.
- Modelo de ingresos declarado en la landing: suscripción de proveedores y comisión por acuerdos cerrados; nunca venta de datos. Ninguno está implementado todavía.
- Inferido del brief: el onboarding debe llegar a la decisión de zona antes de abrir el dashboard.
- La ruta explica fuentes y evidencia, pero no expide permisos ni garantiza cumplimiento; uso de suelo, apertura, Protección Civil y varios requisitos dependen del municipio y la actividad.

## Brand Commitments

Nombre: Tlacuachip. Voz directa, práctica y sin prometer resultados financieros. El usuario es dueño de sus datos y controla qué comparte con la red.

## Evidence on Hand

- Conteos reales de negocios por categoría y zona desde OpenStreetMap.
- Datos de crecimiento, demanda y costos actuales son datos de demostración/estimación; no se deben representar como oficiales.

## Product Principles

1. Explicar una decisión antes de pedir que el usuario actúe.
2. Diferenciar con claridad entre datos reales, estimaciones y recomendaciones.
3. El usuario conserva control de su perfil, visibilidad y eliminación de datos.
4. Mostrar el siguiente paso útil, no todas las opciones a la vez.
