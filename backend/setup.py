from setuptools import setup, find_packages

setup(
    name="secure_file_share",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        'django',
        'djangorestframework',
        'django-cors-headers',
    ],
)
