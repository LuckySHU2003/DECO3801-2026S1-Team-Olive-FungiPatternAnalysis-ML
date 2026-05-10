from pathlib import Path

import pytest

from app.adapters.registry import select_adapter
from app.adapters.sklearn_adapter import SklearnModelAdapter
from app.adapters.base import ModelAdapterError


def test_selects_sklearn_adapter():
    assert isinstance(select_adapter("pkl", Path("model.pkl")), SklearnModelAdapter)


def test_rejects_unsupported_adapter():
    with pytest.raises(ModelAdapterError):
        select_adapter("abc", Path("model.abc"))
