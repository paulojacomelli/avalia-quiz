# 🔐 Correção: Workload Identity Attribute Mapping

O Google precisa de um atributo que vem do GitHub token. Use este:

**Em vez de:**
```
assertion.repository_owner == 'paulojacomelli'
```

**Use:**
```
assertion.sub.startsWith('repo:paulojacomelli/avalia-quiz:')
```

Ou se preferir mais simples:

```
assertion.actor == 'paulojacomelli'
```

Tente com `assertion.actor` primeiro.
