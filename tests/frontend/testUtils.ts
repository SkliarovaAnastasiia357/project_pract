import assert from "node:assert/strict";

import { ApiClientError } from "../../src/shared/api/contracts.ts";

export async function expectApiError(
  callback: () => Promise<unknown>,
  expectedMessage: string,
  expectedField?: { name: string; value: string },
): Promise<void> {
  try {
    await callback();
    assert.fail("ожидалась ошибка API, но запрос завершился успешно");
  } catch (error) {
    assert.equal(error instanceof ApiClientError, true, "ошибка должна иметь тип ApiClientError");

    const apiError = error as ApiClientError;
    assert.equal(apiError.message, expectedMessage, "ошибка API должна содержать ожидаемое сообщение");

    if (expectedField) {
      assert.equal(
        apiError.fieldErrors?.[expectedField.name],
        expectedField.value,
        `ошибка поля ${expectedField.name} должна содержать ожидаемое сообщение`,
      );
    }
  }
}
