# -*- coding: utf-8 -*-
"""Gera PDF resumo das últimas ~20h de pedidos do user pro CORTEX."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from datetime import datetime

NEON   = HexColor("#b061ff")
NEON2  = HexColor("#7a2bff")
NEON3  = HexColor("#e26bff")
BG     = HexColor("#0d0721")
SURF   = HexColor("#16092f")
TEXT   = HexColor("#efe8ff")
DIM    = HexColor("#b8a8d8")
MUTE   = HexColor("#7e6aa8")
GOOD   = HexColor("#5cffb1")
WARN   = HexColor("#ffb86b")
BAD    = HexColor("#ff7a9a")
BORDER = HexColor("#3a2666")

OUT = "cortex_summary_20h.pdf"

styles = getSampleStyleSheet()
title  = ParagraphStyle('Title', parent=styles['Title'],
    fontName='Helvetica-Bold', fontSize=26, leading=30,
    textColor=NEON3, alignment=TA_LEFT, spaceAfter=2)
subtitle = ParagraphStyle('Sub', parent=styles['Normal'],
    fontName='Helvetica', fontSize=10, leading=14,
    textColor=DIM, spaceAfter=18)
h2 = ParagraphStyle('H2', parent=styles['Heading2'],
    fontName='Helvetica-Bold', fontSize=14, leading=18,
    textColor=NEON, spaceBefore=14, spaceAfter=6,
    borderPadding=4)
bullet = ParagraphStyle('Bullet', parent=styles['Normal'],
    fontName='Helvetica', fontSize=10.5, leading=15,
    textColor=TEXT, leftIndent=14, bulletIndent=2,
    spaceAfter=3)
star = ParagraphStyle('Star', parent=bullet,
    textColor=NEON3, fontName='Helvetica-Bold')
note = ParagraphStyle('Note', parent=styles['Normal'],
    fontName='Helvetica-Oblique', fontSize=9.5, leading=13,
    textColor=MUTE, spaceAfter=10)
stat_lbl = ParagraphStyle('StatLbl', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=8.5, textColor=MUTE,
    alignment=TA_CENTER, leading=10)
stat_val = ParagraphStyle('StatVal', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=22, textColor=NEON3,
    alignment=TA_CENTER, leading=24)

def b(text):
    """Bullet paragraph with bullet char."""
    return Paragraph(f"• {text}", bullet)

def section(title_text, items):
    flow = [Paragraph(title_text, h2)]
    flow.append(_divider())
    for it in items:
        flow.append(b(it))
    flow.append(Spacer(1, 4))
    return flow

def _divider():
    t = Table([[' ']], colWidths=[170*mm], rowHeights=[1.2])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,-1), NEON2),
        ('LINEBELOW',  (0,0),(-1,-1), 1, NEON2),
    ]))
    return t

def stat_card(label, value):
    t = Table([[Paragraph(value, stat_val)],
               [Paragraph(label, stat_lbl)]],
              colWidths=[54*mm], rowHeights=[28, 14])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,-1), SURF),
        ('BOX', (0,0),(-1,-1), 0.6, BORDER),
        ('ROUNDEDCORNERS', [6,6,6,6]),
        ('TOPPADDING', (0,0),(-1,-1), 6),
        ('BOTTOMPADDING', (0,0),(-1,-1), 2),
    ]))
    return t

def page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    # Faixa neon no topo
    canvas.setFillColor(NEON2)
    canvas.rect(0, A4[1]-6, A4[0], 6, stroke=0, fill=1)
    # Rodapé
    canvas.setFillColor(MUTE)
    canvas.setFont('Helvetica', 7.5)
    canvas.drawString(15*mm, 10*mm, f"CORTEX · gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    canvas.drawRightString(A4[0]-15*mm, 10*mm, f"página {doc.page}")
    canvas.restoreState()

# ── conteúdo ────────────────────────────────────────────────
story = []
story.append(Paragraph("CORTEX · Resumo das últimas 20h", title))
story.append(Paragraph(
    f"Sessão extensiva de evolução do produto · {datetime.now().strftime('%d de %B de %Y')}",
    subtitle))

# Stats row
stats = Table(
    [[stat_card("FEATURES", "41"),
      stat_card("ARQUIVOS NOVOS", "8"),
      stat_card("LINGUAGENS", "2")]],
    colWidths=[58*mm, 58*mm, 58*mm])
stats.setStyle(TableStyle([
    ('VALIGN', (0,0),(-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0),(-1,-1), 2),
    ('RIGHTPADDING', (0,0),(-1,-1), 2),
]))
story.append(stats)
story.append(Spacer(1, 18))

# Seções
story += section("IA / CORTEX Assistant", [
    "<b>Integração LLM real</b> · OpenAI, Anthropic, Groq com API key local",
    "<b>System prompt</b> com snapshot do state (tarefas, hábitos, finanças, eventos) injetado",
    "<b>Tool-calling JSON</b> · 16 ações executáveis: add_event, add_task, add_transaction, add_note, add_draft, add_habit, log_habit, add_project, add_trigger, add_bill, add_diet_plan_item, add_goal, add_shopping_item, add_memory, open_site, navigate, clear_chat",
    "<b>Streaming SSE</b> · respostas progressivas em tempo real com cursor blinking",
    "<b>Memória pinada</b> · fatos persistentes injetados no prompt + UI add/remove",
    "<b>Trailing icon vira ■ stop</b> durante geração com AbortController",
    "<b>Fallback rule-based</b> quando IA falha ou está desconfigurada",
])

story += section("Voz / Áudio", [
    "<b>TTS Jarvis-style</b> · vozes neural priorizadas (Edge Online Natural / Daniel macOS)",
    "Voz masculina forçada via whitelist/blacklist nome (PT-BR + EN)",
    "Pitch 0.78 + rate 0.96, chunks por frase + jitter, keepalive Chrome anti-cut",
    "<b>Speech-to-text</b> com wake word 'CORTEX' (state machine idle/armed)",
    "Silence timeout 1.6s → auto-send + reinício do estado",
    "<b>STOP por voz</b> · 'cortex pare / para / stop / cala / chega' interrompe TTS",
    "AEC no getUserMedia · cancela eco da própria voz da IA",
    "Strip emojis no TTS (\\p{Extended_Pictographic} + bandeiras + ZWJ)",
])

story += section("Esfera / CORTEX Hero", [
    "4 modelos · <b>Clássica · Wireframe · Nebulosa · Hélice</b>",
    "Morph suave xyz lerp 60 frames entre modelos",
    "Mic-reactive · amplitude FFT modula intensity",
    "Constelações idle · linhas finas entre vizinhos",
    "Click ripple · onda radial + spike de intensidade",
    "Sphere model picker card grid premium com SVG schematics 3D",
])

story += section("UI / Design System", [
    "<b>Light + Dark + Auto theme</b> · schedule por horário (sunrise/sunset)",
    "<b>Theme builder</b> · 12 color pickers pra paleta completa",
    "<b>Bento dashboard layout</b> · grid asymmetric estilo Apple",
    "<b>Print stylesheet @media print</b> · A4 com cores otimizadas",
    "Mobile responsive · sidebar sheet overlay <600px + hamburguer",
    "Input premium glass refeito · pill 999px + border neon ambient",
    "Send button minimal redondo · stop ■ branco quando busy",
    "Menu ações ✦ consolidado · Esfera / Mic / Voz / Apagar",
    "Pop-ups (toasts) removidos do fluxo CORTEX · indicadores visuais persistentes",
])

# Página 2
story.append(PageBreak())

story += section("Produtividade", [
    "<b>Command palette ⌘K / Ctrl+K</b> · busca unified em notas/tasks/events/triggers/pages/actions",
    "<b>Atalhos teclado</b> · J/K navegação, ? help modal, / foco CORTEX input",
    "<b>Drag-and-drop</b> · arrastar eventos entre dias na month view",
    "Trailing icon stop com cancel real (AbortController + TTS cancel)",
])

story += section("Features novas", [
    "<b>Dashboard Hábitos</b> · Chart.js (7d bar, donut categoria/horário, top 5 streaks, heatmap 12 semanas, em risco)",
    "<b>Dieta reescrita</b> · modal + cards expansíveis + mood + lista alimentos (estilo Treinos)",
    "<b>Plano de Hoje</b> em Dieta · 5 slots refeição com checkboxes",
    "<b>Sistema de copy</b> minimalista nos Rascunhos · hover-revealed",
    "<b>Open site command</b> · 35+ sites populares + fallback Google search",
])

story += section("Sidebar / Layout", [
    "Logo centralizada quando colapsada",
    "Clock vira mini quadrado 52×52 · hora top + data bottom",
    "Scrollbar escondida no estado colapsado",
    "Botão collapse incolor com mini halo neon",
    "Conteúdo main centraliza quando sidebar colapsa",
    "<b>Logout button</b> ao lado da gear, alinhado com H1 'CORTEX'",
])

story += section("i18n", [
    "<b>PT-BR ↔ EN</b> via dicionário com 350+ entradas",
    "Walker de DOM + MutationObserver pra catch dynamic content",
    "Idioma persistido em state.settings.language",
])

story += section("Segurança / Privacidade", [
    "<b>Encrypt localStorage opt-in</b> · AES-256-GCM via Web Crypto",
    "PBKDF2 250k iterações · senha derivada local",
    "Boot async com prompt de unlock full-screen",
    "Trocar senha / desativar / ativar via UI settings",
])

story += section("Notáveis", [
    "<i>Drop / re-add</i> da função 'palma dupla' pediu 5 ajustes de sensibilidade",
    "Voz testada com várias intensidades de jitter e pitch",
    "Encrypt cuidadoso · save() async com fallback plaintext em caso de erro",
])

story.append(Spacer(1, 10))
story.append(Paragraph(
    "Total estimado: <b>+41 features</b> entregues · ~30 arquivos modificados · 8 arquivos novos criados.",
    note))

# Build
doc = SimpleDocTemplate(OUT, pagesize=A4,
    leftMargin=15*mm, rightMargin=15*mm,
    topMargin=18*mm, bottomMargin=18*mm,
    title="CORTEX Summary 20h")
doc.build(story, onFirstPage=page_bg, onLaterPages=page_bg)
print("OK:", OUT)
