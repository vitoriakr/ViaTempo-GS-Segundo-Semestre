//#define SECRET_MQTT_USERNAME "HRoJJg4nKTYLDS4XIikHOiU"
//#define SECRET_MQTT_CLIENT_ID "HRoJJg4nKTYLDS4XIikHOiU"
//#define SECRET_MQTT_PASSWORD "ZHMEbvOmYuC/QUOYhRVqbhAn"

#include <WiFi.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <PubSubClient.h>

// pinagem
#define PIN_DHT         15    // DHT22 - clima risco de chuva
#define DHTTYPE         DHT22
#define PIN_POT_TRAFEGO 34    // Potenciometro - Nivel de Transito (0 a 100%)
#define PIN_BUZZER      18    // Atuador Sonoro - alarme
#define PIN_LED_ALERTA  19    // atuador Visual - alarme critico
#define PIN_BTN_SONECA  4     // Botao Fisico - desligar / soneca

// CONFIGURACOES DE REDE E THINGSPEAK
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// Suas credenciais oficiais
const char* thingspeak_api_key = "BVCGC4KTDWK9GS13";
const long  channel_id         = 3586432;

// OBJETOS
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(PIN_DHT, DHTTYPE);

// TEMPORIZADORES 
unsigned long lastSensorSampleTime = 0;
const unsigned long SENSOR_SAMPLE_INTERVAL = 1000; // Amostragem a cada 1s

unsigned long lastCloudSendTime = 0;
const unsigned long CLOUD_SEND_INTERVAL = 15000;   // Envio para nuvem a cada 15 segundos

unsigned long lastLcdUpdateTime = 0;
const unsigned long LCD_UPDATE_INTERVAL = 500;     // Display atualiza a cada 0.5segs

unsigned long lastBuzzerToggleTime = 0;
bool buzzerState = false;

// Variaveis de leitura
float temperatura = 0.0;
float umidade = 0.0;
int   nivelTrafego = 0;

// Estados de borda
bool alertaCritico = false;
int  statusAlarme = 1; // 0 = Soneca, 1 = Armado, 2 = Disparando
bool nuvemConectada = false;

// ==========================================
// ENVIO PARA O THINGSPEAK
// ==========================================
void enviarThingSpeak(float temp, float umi, int trafego, int alarme, int alerta) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "http://api.thingspeak.com/update?api_key=" + String(thingspeak_api_key) +
                 "&field1=" + String(temp, 1) +
                 "&field2=" + String(umi, 1) +
                 "&field3=" + String(trafego) +
                 "&field4=" + String(alarme) +
                 "&field5=" + String(alerta);

    Serial.print("[NUVEM] Enviando telemetria ao ThingSpeak... ");
    http.begin(url);
    int httpCode = http.GET();

    if (httpCode > 0) {
      String response = http.getString();
      Serial.print("Sucesso! Registro ID: ");
      Serial.println(response);
      nuvemConectada = true;
    } else {
      Serial.print("Falha HTTP: ");
      Serial.println(httpCode);
      nuvemConectada = false;
    }
    http.end();
  } else {
    nuvemConectada = false;
  }
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  Serial.println("Iniciando ViaTempo - Smart Alarm Hub...");

  pinMode(PIN_POT_TRAFEGO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_ALERTA, OUTPUT);
  pinMode(PIN_BTN_SONECA, INPUT_PULLUP);

  digitalWrite(PIN_LED_ALERTA, LOW);
  noTone(PIN_BUZZER);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("ViaTempo Hub");
  lcd.setCursor(0, 1);
  lcd.print("Conectando...");

  dht.begin();

  WiFi.begin(ssid, password);
  int tentativasWifi = 0;
  while (WiFi.status() != WL_CONNECTED && tentativasWifi < 20) {
    delay(200);
    Serial.print(".");
    tentativasWifi++;
  }
  Serial.println("\nWiFi Conectado!");

  lcd.clear();
}

// ==========================================
// LOOP 
// ==========================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Amostragem dos Sensores (A cada 1 segundo)
  if (currentMillis - lastSensorSampleTime >= SENSOR_SAMPLE_INTERVAL) {
    lastSensorSampleTime = currentMillis;

    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      temperatura = t;
      umidade = h;
    }

    int rawPot = analogRead(PIN_POT_TRAFEGO);
    nivelTrafego = map(rawPot, 0, 4095, 0, 100);

    // logica de borda
    if (nivelTrafego > 75 || umidade > 85.0) {
      alertaCritico = true;
      digitalWrite(PIN_LED_ALERTA, HIGH);
      if (statusAlarme == 1 && nivelTrafego > 85) {
        statusAlarme = 2; // Forca disparo antecipado
      }
    } else {
      alertaCritico = false;
      digitalWrite(PIN_LED_ALERTA, LOW);
    }
  }

  // Botao fisico de Soneca / Desligar alarme
  if (digitalRead(PIN_BTN_SONECA) == LOW) {
    if (statusAlarme == 2) {
      Serial.println("[BOTAO] Alarme desligado pelo usuario.");
      statusAlarme = 0;
      noTone(PIN_BUZZER);
    }
  }

  // controle do Buzzer 
  if (statusAlarme == 2) {
    if (currentMillis - lastBuzzerToggleTime >= 250) {
      lastBuzzerToggleTime = currentMillis;
      buzzerState = !buzzerState;
      if (buzzerState) {
        tone(PIN_BUZZER, 1000);
      } else {
        noTone(PIN_BUZZER);
      }
    }
  } else {
    noTone(PIN_BUZZER);
  }

  // Envio ThingSpeak a cada 15 segundos
  if (currentMillis - lastCloudSendTime >= CLOUD_SEND_INTERVAL) {
    lastCloudSendTime = currentMillis;
    enviarThingSpeak(temperatura, umidade, nivelTrafego, statusAlarme, alertaCritico ? 1 : 0);
  }

  // Atualiza Display LCD 
  if (currentMillis - lastLcdUpdateTime >= LCD_UPDATE_INTERVAL) {
    lastLcdUpdateTime = currentMillis;

    // Medidas dos Sensores
    lcd.setCursor(0, 0);
    lcd.print("C:");
    lcd.print((int)umidade);
    lcd.print("% ");
    lcd.print("Trf:");
    lcd.print(nivelTrafego);
    lcd.print("%   ");

    // Status do Alarme e Status da Conexao
    lcd.setCursor(0, 1);
    if (statusAlarme == 2) {
      lcd.print("ALRM:DISPAR! ");
    } else if (statusAlarme == 1) {
      lcd.print("ALRM:ARMADO  ");
    } else {
      lcd.print("ALRM:SONECA  ");
    }

    if (WiFi.status() != WL_CONNECTED) {
      lcd.setCursor(13, 1);
      lcd.print("W:X");
    } else if (nuvemConectada) {
      lcd.setCursor(13, 1);
      lcd.print("M:OK");
    } else {
      lcd.setCursor(13, 1);
      lcd.print("M:--");
    }
  }
}