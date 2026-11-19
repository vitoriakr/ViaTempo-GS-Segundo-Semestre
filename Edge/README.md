# ViaTempo - Smart Alarm Hub
## Edge computing sistems - Global Solution

##  Integrantes:
* **Anita Palhares** - RM571264
* **Kauã Coelho** - RM568665
* **Vitória Kereski** - RM569438

### O que é o Smart Alarm Hub?
— Um terminal de inteligente baseado no microcontrolador **ESP32**, que simula as funcionalidades da solução ViaTempo de forma simples, onde o **ViaTempo** é app voltada para a gestão preventiva da mobilidade urbana e do tempo do cidadão. Diferente de aplicativos tradicionais de rotas (como Waze ou Google Maps) que atuam apenas de forma reativa quando o usuário já está no trânsito, o ViaTempo opera na etapa de **planejamento prévio**: ele integra a rotina do usuário (tempo para acordar, se arrumar e tempo de deslocamento) às condições climáticas e viárias dinâmicas da cidade. O Smart Alarm usa da temperatura e humidade para simular as mudanças climaticas e um regulador para simular o trânsito para cumprir a funcionalidade de despertador do app: te acordar de forma dinâmica com os imprevistos da cidade.

#### Em mais detalhes...

— Em vez de depender exclusivamente de notificações silenciosas do smartphone (que frequentemente são ignoradas ou dependem de conexão contínua de internet no aparelho móvel), o Hub atua como uma interface física autônoma:
1. **Monitoramento Ambiental e Viário:** Realiza leituras locais de temperatura e umidade (identificando riscos de chuvas severas ou alagamentos) e monitora o nível de congestionamento da rota prioritária.
2. **Decisão Inteligente:** Se o nível de trânsito ou o risco climático ultrapassarem limites seguros, o Hub **não espera passivamente**: ele toma uma decisão local e autônoma, ativando alertas visuais preventivos e antecipando o alarme sonoro matinal para proteger a pontualidade do usuário.
3. **Telemetria e Controle Bidirecional em Nuvem:** Envia dados de status para a plataforma em nuvem (**ThingSpeak**) e mantém-se preparado para receber atualizações e comandos de controle remoto.

---

##  Arquitetura e Componentes de Hardware
* **Microcontrolador:** ESP32 DevKit v4
* **Display Local:** LCD 16x2 com interface I2C (Endereço `0x27`, pinos GPIO 21 SDA e GPIO 22 SCL)
* **Sensor de Clima / Chuva:** DHT22 (Sensor digital de Temperatura e Umidade no GPIO 15)
* **Sensor de Nível de Tráfego:** Potenciômetro analógico (GPIO 34 - ADC)
* **Atuador Sonoro (Alarme):** Buzzer Piezoelétrico (GPIO 18 - PWM)
* **Atuador Visual (Alerta Crítico):** LED Vermelho de alto brilho com resistor de 220Ω (GPIO 19)
* **Interação Física Local:** Pushbutton com resistor interno PULL-UP (GPIO 4 - Função Soneca/Desligar)

---
### Tabela de Pinagem 

| Componente | Tipo / Função | Pino do Componente | Pino no ESP32 | Descrição / Protocolo |
| :--- | :--- | :--- | :--- | :--- |
| **LCD 16x2 I2C** | Interface Gráfica Local | **GND** | **GND** | Aterramento comum |
| | | **VCC** | **5V / VIN** | Alimentação lógica do display |
| | | **SDA** | **GPIO 21** | Linha de Dados do barramento I2C padrão |
| | | **SCL** | **GPIO 22** | Linha de Clock do barramento I2C padrão |
| **DHT22** | Sensor Climático Digital | **VCC (Pino 1)** | **3V3** | Alimentação positiva (3.3V) |
| | | **SDA / DATA (Pino 2)**| **GPIO 15** | Barramento digital proprietário de leitura única |
| | | **GND (Pino 4)** | **GND** | Aterramento comum |
| **Potenciômetro** | Sensor Analógico de Tráfego| **GND (Pino 1)** | **GND** | Referência de 0V |
| | | **SIG (Pino 2 - Meio)**| **GPIO 34** | Entrada analógica ADC1_CH6 (Resolução 12 bits: 0 a 4095) |
| | | **VCC (Pino 3)** | **3V3** | Tensão de referência máxima (3.3V) |
| **Buzzer** | Atuador Sonoro (Alarme) | **Positivo (+)** | **GPIO 18** | Modulação de sinal sonoro (Frequência de 1 kHz) |
| | | **Negativo (-)** | **GND** | Aterramento comum |
| **LED Vermelho** | Atuador Visual (Alerta) | **Ânodo (+)** | **GPIO 19** | Sinal digital HIGH/LOW (com resistor limitador 220Ω) |
| | | **Cátodo (-)** | **GND** | Aterramento comum |
| **Pushbutton** | Interação Física (Soneca)| **Terminal 1.l** | **GPIO 4** | Entrada digital configurada como `INPUT_PULLUP` interno |
| | | **Terminal 2.r** | **GND** | Fechamento em nível lógico LOW ao pressionar |

---

* **Decisão Autônoma:**
  * Se o nível de trânsito ultrapassar **75%** ou a umidade relativa superar **85%** (risco iminente de temporal/alagamento), o dispositivo aciona imediatamente o LED de alerta.
  * Se o congestionamento atingir nível crítico (> **85%**), o alarme é disparado antecipadamente (`ALRM:DISPAR!`) com sinal sonoro intermitente de 1 kHz.
  * O botão físico no GPIO 4 desativa o alarme localmente através de interrupção lógica, alterando o status para Soneca.

O dispositivo opera localmente sob três estados principais:
* **Estado 0 - Soneca / Desarmado (`ALRM:SONECA`):** O alarme foi atendido ou desligado localmente pelo usuário.
* **Estado 1 - Monitoramento Preventivo (`ALRM:ARMADO`):** O sistema monitora ativamente as variáveis do ambiente e da rota.
* **Estado 2 - Disparo Ativo (`ALRM:DISPAR!`):** O alarme está tocando ativamente e emitindo alerta sonoro intermitente.

---

##  Nuvem e Persistência de Dados (ThingSpeak)
* **Canal ID:** `3586432`
* **Transmissão:** Envio de telemetria a cada 15 segundos mapeando:
  * **Field 1:** Temperatura (°C)
  * **Field 2:** Umidade Relativa (%)
  * **Field 3:** Nível de Tráfego (0 a 100%)
  * **Field 4:** Status do Alarme (0=Soneca, 1=Armado, 2=Disparando)
  * **Field 5:** Flag de Alerta Crítico (0=Normal, 1=Crítico)

---

##  Interface Gráfica Local (Display LCD 16x2)
O display fornece feedback em tempo real cumprindo os três requisitos obrigatórios:
* **Linha 1:** Leituras dos sensores (`C:<Umidade>% Trf:<Tráfego>%`)
* **Linha 2:** Status do Atuador (`ALRM:ARMADO`, `ALRM:DISPAR!` ou `ALRM:SONECA`)
* **Diagnóstico de Conectividade:** Indicador de status no canto inferior direito (`M:OK` para conexão de nuvem ativa, `W:X` para queda de Wi-Fi e `M:--` para falha de envio).

O display atende integralmente à rubrica de avaliação, exibindo em tempo real e de forma compacta as três informações obrigatórias:

estrutura:

```text
+----------------+
|C:82%  Trf:48%  |  <- Linha 1: Dados de Sensores (Umidade Climática e Nível de Trânsito)
|ALRM:ARMADO M:OK|  <- Linha 2: Status do Atuador e Diagnóstico de Rede
+----------------+
```

---

## Simulação
* **Link da Simulação no Wokwi:** https://wokwi.com/projects/481084461184291841
* **ThingSpeak:** https://thingspeak.mathworks.com/channels/3586432/private_show

Channel ID: 3586432

Author: mwa0000043123166

Access: Private

*** se houver qualquer problema para acessar, não pense duas vezes em me cobrar!

## Estrutura de Arquivos do Repositório

```
├── diagram.json          # Arquivo de configuração e ligações do circuito Wokwi
├── libraries.txt         # Dependências externas compiladas (LiquidCrystal I2C, DHT, PubSubClient)
├── sketch.ino            # Código-fonte principal C++ do ESP32
├── GS_video_edge01.mp4   # Vídeo com a simulação e todos as operacionalidade funcionando
└── README.md             # Documentação técnica e guia do projeto

```
