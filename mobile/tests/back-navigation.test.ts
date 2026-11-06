import test from "node:test";
import assert from "node:assert/strict";
import { backOrHome } from "../src/core/back-navigation";

test("system/header Back pops one route and consumes the event when history exists", () => {
  const routes = ["search", "movie", "person"];
  const navigation = {
    canGoBack: () => routes.length > 1,
    back: () => {
      routes.pop();
    },
    replace: () => {
      throw new Error("Unexpected home redirect");
    },
  };
  assert.equal(backOrHome(navigation), true);
  assert.deepEqual(routes, ["search", "movie"]);
  assert.equal(backOrHome(navigation), true);
  assert.deepEqual(routes, ["search"]);
});
test("Back from a cold-opened detail or a tab without history goes home instead of exiting", () => {
  let destination = "";
  assert.equal(
    backOrHome({
      canGoBack: () => false,
      back: () => {
        throw new Error("Unexpected pop");
      },
      replace: (href) => {
        destination = href;
      },
    }),
    true,
  );
  assert.equal(destination, "/(tabs)");
});
test("only Home without history allows Android's default exit action", () => {
  const navigation = {
    canGoBack: () => false,
    back: () => {
      throw new Error("Unexpected pop");
    },
    replace: () => {
      throw new Error("Unexpected replacement");
    },
  };
  assert.equal(backOrHome(navigation, true), false);
});
