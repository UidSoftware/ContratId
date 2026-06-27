from django.db import migrations, models
import django.db.models.deletion
from decimal import Decimal


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('contratos', '0002_initial'),
        ('empresas', '0001_initial'),
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Orcamento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero', models.PositiveIntegerField(verbose_name='Número')),
                ('emitido_em', models.DateField(auto_now_add=True, verbose_name='Emitido em')),
                ('valido_ate', models.DateField(verbose_name='Válido até')),
                ('status', models.CharField(
                    choices=[
                        ('rascunho', 'Rascunho'), ('enviado', 'Enviado'),
                        ('aprovado', 'Aprovado'), ('recusado', 'Recusado'),
                        ('expirado', 'Expirado'), ('cancelado', 'Cancelado'),
                    ],
                    db_index=True, default='rascunho', max_length=20, verbose_name='Status',
                )),
                ('cliente_nome', models.CharField(max_length=200, verbose_name='Nome do cliente')),
                ('cliente_email', models.EmailField(blank=True, max_length=254, verbose_name='E-mail')),
                ('cliente_telefone', models.CharField(blank=True, max_length=20, verbose_name='Telefone')),
                ('cliente_cpf_cnpj', models.CharField(blank=True, max_length=20, verbose_name='CPF/CNPJ')),
                ('cliente_rg', models.CharField(blank=True, max_length=20, verbose_name='RG')),
                ('cliente_endereco', models.CharField(blank=True, max_length=300, verbose_name='Endereço')),
                ('cliente_bairro', models.CharField(blank=True, max_length=100, verbose_name='Bairro')),
                ('cliente_cidade', models.CharField(blank=True, max_length=100, verbose_name='Cidade')),
                ('cliente_estado', models.CharField(blank=True, max_length=2, verbose_name='Estado')),
                ('cliente_cep', models.CharField(blank=True, max_length=9, verbose_name='CEP')),
                ('desconto', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12, verbose_name='Desconto (R$)')),
                ('forma_pagamento', models.CharField(blank=True, max_length=200, verbose_name='Forma de pagamento')),
                ('observacoes', models.TextField(blank=True, verbose_name='Observações')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('atualizado_em', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('empresa', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='orcamentos', to='empresas.empresa', verbose_name='Empresa',
                )),
                ('contrato', models.OneToOneField(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='orcamento', to='contratos.contrato', verbose_name='Contrato gerado',
                )),
                ('criado_por', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='orcamentos_criados', to='usuarios.usuario', verbose_name='Criado por',
                )),
            ],
            options={
                'verbose_name': 'Orçamento',
                'verbose_name_plural': 'Orçamentos',
                'ordering': ['-criado_em'],
            },
        ),
        migrations.AddConstraint(
            model_name='orcamento',
            constraint=models.UniqueConstraint(fields=['empresa', 'numero'], name='unique_numero_por_empresa'),
        ),
        migrations.CreateModel(
            name='ItemOrcamento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ordem', models.PositiveSmallIntegerField(default=1, verbose_name='Ordem')),
                ('descricao', models.CharField(max_length=300, verbose_name='Descrição')),
                ('quantidade', models.DecimalField(decimal_places=3, default=1, max_digits=10, verbose_name='Quantidade')),
                ('valor_unitario', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Valor unitário')),
                ('orcamento', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='itens', to='orcamentos.orcamento', verbose_name='Orçamento',
                )),
            ],
            options={
                'verbose_name': 'Item de Orçamento',
                'verbose_name_plural': 'Itens de Orçamento',
                'ordering': ['ordem'],
            },
        ),
    ]
