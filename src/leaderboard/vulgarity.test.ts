import { describe, expect, it } from "vitest";
import { containsVulgarity } from "./vulgarity";

describe("filtro de palavrões no nome", () => {
  it("aceita nomes limpos nos dois idiomas", () => {
    const clean = [
      "Tani", "Koi Keeper", "São Paulo", "Açaí", "peixinho dourado",
      "Carp 07", "Épico", "Vó Lurdes",
    ];
    for (const name of clean) expect(containsVulgarity(name)).toBe(false);
  });

  it("não pega palavras inocentes no caminho (problema de Scunthorpe)", () => {
    const innocent = [
      "Class", "bass player", "Massachusetts", "cassie", "document",
      "cocker", "cuidar", "curso", "assadoura",
    ];
    for (const name of innocent) expect(containsVulgarity(name)).toBe(false);
  });

  it("bloqueia palavrões claros", () => {
    const vulgar = [
      "fuck", "FUCK YOU", "shit", "bitch", "cunt", "whore", "faggot",
      "merda", "porra", "caralho", "buceta", "puta", "putinha", "viado",
      "arrombado", "boquete", "punheta", "cacete", "bosta", "cuzao", "cu",
      "ass", "dick", "cock", "penis",
    ];
    for (const name of vulgar) expect(containsVulgarity(name)).toBe(true);
  });

  it("bloqueia eivações com acento, leetspeak, repetição e espaço", () => {
    const evasions = [
      "merdã", "sh1t", "c@ralho", "fu ck", "f.u.c.k", "fuuuck", "assss",
      "b1tch", "p0rra", "v1ado", "cú", "fodase",
    ];
    for (const name of evasions) expect(containsVulgarity(name)).toBe(true);
  });
});
