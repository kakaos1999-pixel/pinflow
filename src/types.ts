// PinFlow adatmodell.
//
// Két külön réteg:
//   1. DEFINÍCIÓK (ComponentDef) — a komponensek állandó leírása (méret, lábkiosztás).
//      Ezek a src/data/components.ts regiszterben élnek, nem változnak futás közben.
//   2. ÁLLAPOT (Project) — a vászonra lehelyezett példányok (Instance) és a lábakat
//      összekötő vezetékek (Wire). Ez mentődik JSON-ba / localStorage-ba.

/** Egy busz/jel-kategória, ami a láb színezését és csoportosítását segíti. */
export type Bus =
  | "power" // tápfeszültség (3V3, 5V, VIN, V+)
  | "gnd" // föld
  | "gpio" // általános GPIO
  | "i2c" // I2C (SDA/SCL)
  | "spi" // SPI (MOSI/MISO/SCLK/CS)
  | "uart" // soros (TX/RX)
  | "i2s" // I2S hang (BCLK/LRCL/DATA)
  | "pwm" // PWM kimenet
  | "analog" // analóg bemenet (ADC)
  | "other"; // minden egyéb (OE, RST, INT, cím-lábak...)

/** Egy láb a komponens DEFINÍCIÓJÁBAN, a komponens helyi koordinátarendszerében. */
export interface Pin {
  /** A definíción belül EGYEDI azonosító (pl. "3" a fizikai 3-as lábhoz, vagy "SDA"). */
  id: string;
  /** A láb felirata a vásznon (pl. "GPIO2", "3V3", "SDA"). */
  name: string;
  /** Opcionális másodlagos felirat (pl. fizikai lábszám vagy alternatív funkció). */
  sub?: string;
  /** X koordináta a komponens bal-felső sarkához képest, pixelben. */
  x: number;
  /** Y koordináta a komponens bal-felső sarkához képest, pixelben. */
  y: number;
  /** Melyik oldalon ül a láb — a felirat ehhez igazodik. */
  side?: "left" | "right" | "top" | "bottom";
  /** Busz-kategória a színezéshez. */
  bus?: Bus;
}

/** Egy komponens-típus állandó leírása. */
export interface ComponentDef {
  /** Globálisan egyedi típus-azonosító (pl. "rpi5", "esp32-devkit"). */
  id: string;
  /** Megjelenített név. */
  name: string;
  /** Rövid kategória (pl. "SBC", "MCU", "I2C szenzor"). */
  category?: string;
  /** A doboz szélessége pixelben. */
  width: number;
  /** A doboz magassága pixelben. */
  height: number;
  /** A komponens színe (fejléc-sáv). */
  color?: string;
  /** Opcionális leírás / forrásmegjegyzés. */
  note?: string;
  /** A lábak listája. */
  pins: Pin[];
}

/** Egy a vászonra lehelyezett komponens-PÉLDÁNY. */
export interface Instance {
  /** Egyedi példány-azonosító. */
  id: string;
  /** A ComponentDef.id, amire hivatkozik. */
  defId: string;
  /** Pozíció a vászon (világ) koordinátarendszerében. */
  x: number;
  y: number;
  /** Opcionális felhasználói felülírt címke. */
  label?: string;
}

/** Egy vezeték, ami két példány két lábát köti össze. */
export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
  /** Vonalszín; ha hiányzik, a forrás-láb busza alapján számoljuk. */
  color?: string;
}

/** Hivatkozás egy konkrét példány egy konkrét lábára. */
export interface PinRef {
  instanceId: string;
  pinId: string;
}

/** A teljes menthető projekt-állapot. */
export interface Project {
  /** Séma-verzió a jövőbeli migrációkhoz. */
  version: number;
  name: string;
  instances: Instance[];
  wires: Wire[];
}

export const PROJECT_VERSION = 1;

export function emptyProject(name = "Névtelen projekt"): Project {
  return { version: PROJECT_VERSION, name, instances: [], wires: [] };
}
