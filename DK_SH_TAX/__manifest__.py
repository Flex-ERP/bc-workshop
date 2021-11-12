# -*- coding: utf-8 -*-
{
    'name': 'Dk Second Hand Tax',
    'description': 'Dk Second Hand Tax',
    'category': 'Sale',
    'version': '14.0.1.0.2',
    'author' : 'Aktiv Software',
    'website' : 'www.aktivsoftware.com',
    'depends': ['sale_management', 'purchase', 'sale_stock', 'account', 'select_serial_number'],
    'data': [
        'data/account_fiscal_position_data.xml',
        'views/purchase_order_views.xml',
        'views/stock_picking_views.xml',
        'views/stock_move_line_views.xml',
        'views/account_tax_views.xml',
        'views/account_fiscal_position_views.xml',
        'views/stock_production_lot_views.xml',
    ],
}   