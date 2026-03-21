# Pegando o número do commit atual para o Anti-Cache
VERSION=$(git rev-list --count HEAD)

cat cabecalho.html > index.html
echo "<style>" >> index.html
cat estilo.css >> index.html
echo "</style>" >> index.html
echo "<script>" >> index.html
cat assinatura.js >> index.html
echo "</script>" >> index.html
echo "<script src='script.js?v=$VERSION'></script>" >> index.html
echo "</html>" >> index.html

echo "🚀 Versão v$VERSION montada com sucesso!"
